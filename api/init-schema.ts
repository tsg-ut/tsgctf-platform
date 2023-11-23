import type {VercelRequest, VercelResponse} from '@vercel/node';
import {sql} from '@vercel/postgres';

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  try {
    const createResult = await sql`
      CREATE TABLE counters (count integer);
    `;
    const insertResult = await sql`
      INSERT INTO counters (count) VALUES (0);
    `;
    return response.status(200).json({createResult, insertResult});
  } catch (error) {
    return response.status(500).json({error });
  }
}