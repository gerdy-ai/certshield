import type { SupabaseClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { error as errorResponse, success } from '@/lib/api-response';
import { handleRouteError } from '@/lib/api-route';
import { createServiceRoleClient } from '@/lib/supabase';

export const runtime = 'nodejs';

type Plan = 'starter' | 'growth' | 'agency';

interface OrganizationBillingRow {
  id: string;
  clerk_org_id: string;
  plan: Plan;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
}

const billingSelect = `
  id,
  clerk_org_id,
  plan,
  stripe_customer_id,
  stripe_subscription_id
`;

function getStripeClient(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not set.');
  }

  return new Stripe(secretKey);
}

function getWebhookSecret(): string {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not set.');
  }

  return webhookSecret;
}

function getStringRecordValue(
  record: Record<string, string> | null | undefined,
  key: string,
): string | null {
  const value = record?.[key];

  if (!value) {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function getStripeObjectId(
  value: string | Stripe.Customer | Stripe.Subscription | Stripe.DeletedCustomer | null,
): string | null {
  if (!value) {
    return null;
  }

  if (typeof value === 'string') {
    return value;
  }

  return 'id' in value ? value.id : null;
}

async function getOrganizationByColumn(
  supabase: SupabaseClient,
  column: 'id' | 'clerk_org_id' | 'stripe_customer_id' | 'stripe_subscription_id',
  value: string | null,
): Promise<OrganizationBillingRow | null> {
  if (!value) {
    return null;
  }

  const { data, error } = await supabase
    .from('organizations')
    .select(billingSelect)
    .eq(column, value)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as OrganizationBillingRow | null) ?? null;
}

async function resolveOrganizationForCheckoutSession(
  supabase: SupabaseClient,
  session: Stripe.Checkout.Session,
): Promise<OrganizationBillingRow | null> {
  const metadata = session.metadata ?? {};
  const customerId = getStripeObjectId(session.customer);
  const referenceCandidates = [
    getStringRecordValue(metadata, 'organization_id'),
    getStringRecordValue(metadata, 'org_id'),
    session.client_reference_id?.trim() || null,
  ];
  const clerkCandidates = [
    getStringRecordValue(metadata, 'clerk_org_id'),
    getStringRecordValue(metadata, 'clerkOrgId'),
  ];

  for (const organizationId of referenceCandidates) {
    const organization = await getOrganizationByColumn(
      supabase,
      'id',
      organizationId,
    );

    if (organization) {
      return organization;
    }
  }

  for (const clerkOrgId of clerkCandidates) {
    const organization = await getOrganizationByColumn(
      supabase,
      'clerk_org_id',
      clerkOrgId,
    );

    if (organization) {
      return organization;
    }
  }

  return getOrganizationByColumn(supabase, 'stripe_customer_id', customerId);
}

async function resolveOrganizationForSubscription(
  supabase: SupabaseClient,
  subscription: Stripe.Subscription,
): Promise<OrganizationBillingRow | null> {
  const metadata = subscription.metadata ?? {};
  const customerId = getStripeObjectId(subscription.customer);
  const organizationIdCandidates = [
    getStringRecordValue(metadata, 'organization_id'),
    getStringRecordValue(metadata, 'org_id'),
  ];
  const clerkOrgIdCandidates = [
    getStringRecordValue(metadata, 'clerk_org_id'),
    getStringRecordValue(metadata, 'clerkOrgId'),
  ];

  for (const organizationId of organizationIdCandidates) {
    const organization = await getOrganizationByColumn(
      supabase,
      'id',
      organizationId,
    );

    if (organization) {
      return organization;
    }
  }

  for (const clerkOrgId of clerkOrgIdCandidates) {
    const organization = await getOrganizationByColumn(
      supabase,
      'clerk_org_id',
      clerkOrgId,
    );

    if (organization) {
      return organization;
    }
  }

  const byCustomer = await getOrganizationByColumn(
    supabase,
    'stripe_customer_id',
    customerId,
  );

  if (byCustomer) {
    return byCustomer;
  }

  return getOrganizationByColumn(
    supabase,
    'stripe_subscription_id',
    subscription.id,
  );
}

function getPlanFromPriceIds(priceIds: string[]): Plan | null {
  const planByPriceId = new Map<string, Plan>();
  const starterPriceId = process.env.STRIPE_STARTER_PRICE_ID;
  const growthPriceId = process.env.STRIPE_GROWTH_PRICE_ID;
  const agencyPriceId = process.env.STRIPE_AGENCY_PRICE_ID;

  if (starterPriceId) {
    planByPriceId.set(starterPriceId, 'starter');
  }

  if (growthPriceId) {
    planByPriceId.set(growthPriceId, 'growth');
  }

  if (agencyPriceId) {
    planByPriceId.set(agencyPriceId, 'agency');
  }

  if (planByPriceId.size === 0) {
    return null;
  }

  for (const priceId of priceIds) {
    const plan = planByPriceId.get(priceId);

    if (plan) {
      return plan;
    }
  }

  return null;
}

async function updateOrganizationBilling(
  supabase: SupabaseClient,
  organizationId: string,
  updates: Partial<Pick<OrganizationBillingRow, 'plan' | 'stripe_customer_id' | 'stripe_subscription_id'>>,
): Promise<void> {
  if (Object.keys(updates).length === 0) {
    return;
  }

  const { error } = await supabase
    .from('organizations')
    .update(updates)
    .eq('id', organizationId);

  if (error) {
    throw error;
  }
}

async function handleCheckoutCompleted(
  supabase: SupabaseClient,
  session: Stripe.Checkout.Session,
): Promise<void> {
  if (session.mode !== 'subscription') {
    return;
  }

  const organization = await resolveOrganizationForCheckoutSession(
    supabase,
    session,
  );

  if (!organization) {
    console.warn(
      `Stripe webhook: no organization found for checkout session ${session.id}.`,
    );
    return;
  }

  const customerId = getStripeObjectId(session.customer);
  const subscriptionId = getStripeObjectId(session.subscription);
  const updates: Partial<
    Pick<OrganizationBillingRow, 'plan' | 'stripe_customer_id' | 'stripe_subscription_id'>
  > = {};

  if (customerId && organization.stripe_customer_id !== customerId) {
    updates.stripe_customer_id = customerId;
  }

  if (subscriptionId && organization.stripe_subscription_id !== subscriptionId) {
    updates.stripe_subscription_id = subscriptionId;
  }

  await updateOrganizationBilling(supabase, organization.id, updates);
}

async function handleSubscriptionUpsert(
  supabase: SupabaseClient,
  subscription: Stripe.Subscription,
): Promise<void> {
  const organization = await resolveOrganizationForSubscription(
    supabase,
    subscription,
  );

  if (!organization) {
    console.warn(
      `Stripe webhook: no organization found for subscription ${subscription.id}.`,
    );
    return;
  }

  const customerId = getStripeObjectId(subscription.customer);
  const priceIds = subscription.items.data
    .map((item) => item.price.id)
    .filter((priceId): priceId is string => Boolean(priceId));
  const nextPlan = getPlanFromPriceIds(priceIds);
  const updates: Partial<
    Pick<OrganizationBillingRow, 'plan' | 'stripe_customer_id' | 'stripe_subscription_id'>
  > = {};

  if (customerId && organization.stripe_customer_id !== customerId) {
    updates.stripe_customer_id = customerId;
  }

  if (organization.stripe_subscription_id !== subscription.id) {
    updates.stripe_subscription_id = subscription.id;
  }

  if (nextPlan) {
    if (organization.plan !== nextPlan) {
      updates.plan = nextPlan;
    }
  } else if (priceIds.length > 0) {
    console.warn(
      `Stripe webhook: unable to map price ids for subscription ${subscription.id}; plan unchanged.`,
    );
  }

  await updateOrganizationBilling(supabase, organization.id, updates);
}

async function handleSubscriptionDeleted(
  supabase: SupabaseClient,
  subscription: Stripe.Subscription,
): Promise<void> {
  const organization = await resolveOrganizationForSubscription(
    supabase,
    subscription,
  );

  if (!organization) {
    console.warn(
      `Stripe webhook: no organization found for deleted subscription ${subscription.id}.`,
    );
    return;
  }

  const customerId = getStripeObjectId(subscription.customer);
  const updates: Partial<
    Pick<OrganizationBillingRow, 'plan' | 'stripe_customer_id' | 'stripe_subscription_id'>
  > = {
    plan: 'starter',
    stripe_subscription_id: null,
  };

  if (customerId && organization.stripe_customer_id !== customerId) {
    updates.stripe_customer_id = customerId;
  }

  await updateOrganizationBilling(supabase, organization.id, updates);
}

export async function POST(request: Request): Promise<Response> {
  try {
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return errorResponse('Missing Stripe signature.', 'INVALID_SIGNATURE', 400);
    }

    const payload = await request.text();
    let event: Stripe.Event;

    try {
      event = getStripeClient().webhooks.constructEvent(
        payload,
        signature,
        getWebhookSecret(),
      );
    } catch {
      return errorResponse('Invalid Stripe signature.', 'INVALID_SIGNATURE', 400);
    }

    const supabase = createServiceRoleClient();

    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(
          supabase,
          event.data.object as Stripe.Checkout.Session,
        );
        break;
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpsert(
          supabase,
          event.data.object as Stripe.Subscription,
        );
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(
          supabase,
          event.data.object as Stripe.Subscription,
        );
        break;
      default:
        break;
    }

    return success({ received: true });
  } catch (cause) {
    return handleRouteError(cause);
  }
}
