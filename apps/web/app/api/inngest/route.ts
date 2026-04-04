import { serve } from 'inngest/next';
import { inngest } from '@certshield/jobs';
import { inngestFunctions } from '@certshield/jobs/functions';

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: inngestFunctions,
});

