import type {VercelRequest, VercelResponse} from '@vercel/node';
import {sql} from '@vercel/postgres';

export default async function handler(req: VercelRequest, res: VercelResponse) {
	const incrementResult = await sql`
		UPDATE counters SET count = count + 1;
	`;

	const {rows: [{count}]} = await sql<{count: number}>`
		SELECT count FROM counters;
	`;

	res.status(200).json({
		incrementResult,
		message: 'Hello world',
		count,
	});
}