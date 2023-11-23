import type {VercelRequest, VercelResponse} from '@vercel/node';
import type {StopTaskCommandInput} from '@aws-sdk/client-ecs';
import {ECSClient, StopTaskCommand} from '@aws-sdk/client-ecs';
import {PrismaClient} from '@prisma/client';

const prisma = new PrismaClient()

export default async function handler(req: VercelRequest, res: VercelResponse) {
	if (req.method !== 'POST') {
		res.status(405).json({
			error: 'Method Not Allowed',
		});
		return;
	}

	const currentTime = Date.now();

	const ecsTasks = await prisma.ecsTask.findMany({
		where: {
			NOT: {
				status: 'STOPPED',
			},
		},
	});

	const ecs = new ECSClient({
		region: 'ap-northeast-1',
		credentials: {
			accessKeyId: process.env.AWS_ACCESS_KEY_ID,
			secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
		},
	});

	for (const ecsTask of ecsTasks) {
		const threshold = ecsTask.taskStartedAt ?? ecsTask.createdAt;
		const executionEndTimestamp = threshold.getTime() + ecsTask.durationLimit * 1000;

		if (currentTime > executionEndTimestamp) {
			const stopTaskParams: StopTaskCommandInput = {
				cluster: 'tsgctf-test',
				task: ecsTask.taskArn,
			};

			const stopTaskCommand = new StopTaskCommand(stopTaskParams);

			await ecs.send(stopTaskCommand);

			await prisma.ecsTask.update({
				where: {
					taskArn: ecsTask.taskArn,
				},
				data: {
					status: 'STOPPED',
				},
			});
		}
	}

	res.status(200).end('ok')
}

