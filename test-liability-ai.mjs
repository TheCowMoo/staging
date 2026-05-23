import { config } from 'dotenv';
config();

import { generateLiabilityScanResult } from './server/liabilityScanAi.js';

async function testLiabilityScan() {
  try {
    console.log('Testing liability scan AI...');
    const result = await generateLiabilityScanResult({
      answers: {
        q1: 'Yes',
        q2: 'No',
        q3: 'Sometimes',
        q4: 'Yes',
        q5: 'No'
      },
      jurisdiction: 'California',
      industry: 'Healthcare'
    });
    console.log('Success:', result.score);
  } catch (error) {
    console.error('Failed:', error.message);
  }
}

testLiabilityScan();