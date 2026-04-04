import { createServiceRoleSupabaseClient } from './client';

interface SeedSubcontractor {
  first_name: string;
  last_name: string;
  company_name: string;
  email: string;
  phone: string | null;
  certificate: {
    file_name: string;
    file_path: string;
    file_size_bytes: number;
    parse_status: 'pending' | 'processing' | 'complete' | 'failed';
    parse_error: string | null;
    insurer_name: string | null;
    policy_number: string | null;
    policy_type: string | null;
    coverage_amount: number | null;
    effective_date: string | null;
    expiration_date: string | null;
    certificate_holder: string | null;
    additional_insured: boolean | null;
  };
}

const seedSubcontractors: SeedSubcontractor[] = [
  {
    first_name: 'Maria',
    last_name: 'Lopez',
    company_name: 'Lopez Electrical',
    email: 'maria@lopez-electric.test',
    phone: '555-0101',
    certificate: {
      file_name: 'lopez-electrical-2026.pdf',
      file_path: 'certificates/lopez-electrical-2026.pdf',
      file_size_bytes: 182340,
      parse_status: 'complete',
      parse_error: null,
      insurer_name: 'Builders Mutual',
      policy_number: 'BM-10001',
      policy_type: 'General Liability',
      coverage_amount: 1000000,
      effective_date: '2026-01-01',
      expiration_date: '2026-12-31',
      certificate_holder: 'CertShield Demo GC',
      additional_insured: true,
    },
  },
  {
    first_name: 'Jamal',
    last_name: 'Brooks',
    company_name: 'Brooks Roofing',
    email: 'jamal@brooks-roofing.test',
    phone: '555-0102',
    certificate: {
      file_name: 'brooks-roofing-pending.pdf',
      file_path: 'certificates/brooks-roofing-pending.pdf',
      file_size_bytes: 154220,
      parse_status: 'pending',
      parse_error: null,
      insurer_name: null,
      policy_number: null,
      policy_type: null,
      coverage_amount: null,
      effective_date: null,
      expiration_date: null,
      certificate_holder: null,
      additional_insured: null,
    },
  },
  {
    first_name: 'Avery',
    last_name: 'Chen',
    company_name: 'Chen Concrete',
    email: 'avery@chen-concrete.test',
    phone: null,
    certificate: {
      file_name: 'chen-concrete-expiring.pdf',
      file_path: 'certificates/chen-concrete-expiring.pdf',
      file_size_bytes: 205400,
      parse_status: 'complete',
      parse_error: null,
      insurer_name: 'United Specialty',
      policy_number: 'US-55291',
      policy_type: 'Workers Compensation',
      coverage_amount: 750000,
      effective_date: '2025-05-01',
      expiration_date: '2026-04-10',
      certificate_holder: 'CertShield Demo GC',
      additional_insured: false,
    },
  },
  {
    first_name: 'Noah',
    last_name: 'Patel',
    company_name: 'Patel Framing',
    email: 'noah@patel-framing.test',
    phone: '555-0104',
    certificate: {
      file_name: 'patel-framing-processing.pdf',
      file_path: 'certificates/patel-framing-processing.pdf',
      file_size_bytes: 167890,
      parse_status: 'processing',
      parse_error: null,
      insurer_name: null,
      policy_number: null,
      policy_type: null,
      coverage_amount: null,
      effective_date: null,
      expiration_date: null,
      certificate_holder: null,
      additional_insured: null,
    },
  },
  {
    first_name: 'Grace',
    last_name: 'Kim',
    company_name: 'Kim HVAC',
    email: 'grace@kim-hvac.test',
    phone: '555-0105',
    certificate: {
      file_name: 'kim-hvac-failed.pdf',
      file_path: 'certificates/kim-hvac-failed.pdf',
      file_size_bytes: 141225,
      parse_status: 'failed',
      parse_error: 'Unreadable PDF contents.',
      insurer_name: null,
      policy_number: null,
      policy_type: null,
      coverage_amount: null,
      effective_date: null,
      expiration_date: null,
      certificate_holder: null,
      additional_insured: null,
    },
  },
];

async function seed(): Promise<void> {
  const supabase = createServiceRoleSupabaseClient();

  const { data: organization, error: organizationError } = await supabase
    .from('organizations')
    .upsert(
      {
        clerk_org_id: 'org_demo_certshield',
        name: 'CertShield Demo GC',
        slug: 'certshield-demo',
        plan: 'growth',
        notification_email: 'ops@certshield-demo.test',
      },
      {
        onConflict: 'slug',
      },
    )
    .select('id')
    .single();

  if (organizationError || !organization) {
    throw organizationError ?? new Error('Failed to create seed organization.');
  }

  await supabase.from('certificates').delete().eq('org_id', organization.id);
  await supabase.from('subcontractors').delete().eq('org_id', organization.id);

  const { data: subcontractors, error: subcontractorsError } = await supabase
    .from('subcontractors')
    .insert(
      seedSubcontractors.map((item) => ({
        org_id: organization.id,
        first_name: item.first_name,
        last_name: item.last_name,
        company_name: item.company_name,
        email: item.email,
        phone: item.phone,
      })),
    )
    .select('id, email');

  if (subcontractorsError || !subcontractors) {
    throw subcontractorsError ?? new Error('Failed to create subcontractors.');
  }

  const subcontractorByEmail = new Map(
    subcontractors.map((item) => [item.email, item.id] as const),
  );

  const certificates = seedSubcontractors.map((item) => {
    const subcontractorId = subcontractorByEmail.get(item.email);

    if (!subcontractorId) {
      throw new Error(`Missing subcontractor id for ${item.email}.`);
    }

    return {
      org_id: organization.id,
      subcontractor_id: subcontractorId,
      ...item.certificate,
      parsed_at:
        item.certificate.parse_status === 'complete' || item.certificate.parse_status === 'failed'
          ? new Date().toISOString()
          : null,
    };
  });

  const { error: certificatesError } = await supabase.from('certificates').insert(certificates);

  if (certificatesError) {
    throw certificatesError;
  }
}

seed()
  .then(() => {
    console.log('Database seeded.');
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
