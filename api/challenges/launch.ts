import type {VercelRequest, VercelResponse} from '@vercel/node';
import type {RunTaskCommandInput} from '@aws-sdk/client-ecs';
import {ECSClient, RunTaskCommand} from '@aws-sdk/client-ecs';
import {PrismaClient} from '@prisma/client';

const prisma = new PrismaClient()

export default async function handler(req: VercelRequest, res: VercelResponse) {
	if (req.method !== 'POST') {
		res.status(405).json({
			error: 'Method Not Allowed',
		});
		return;
	}

	const ecs = new ECSClient({
		region: 'ap-northeast-1',
		credentials: {
			accessKeyId: process.env.AWS_ACCESS_KEY_ID,
			secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
		},
	});

	const runTaskParams: RunTaskCommandInput = {
		cluster: 'tsgctf-test',
		taskDefinition: 'tsgctf-test-crypto',
		count: 1,
		capacityProviderStrategy: [
			{
				capacityProvider: 'FARGATE_SPOT',
				base: 0,
				weight: 1,
			},
		],
		networkConfiguration: {
			awsvpcConfiguration: {
				subnets: ['subnet-e686fdce'],
				assignPublicIp: 'ENABLED',
				securityGroups: ['sg-3b66cb5f'],
			},
		},
	};

	const runTaskCommand = new RunTaskCommand(runTaskParams);

	const runTaskResult = await ecs.send(runTaskCommand);

	if (runTaskResult.tasks.length !== 1) {
		res.status(500).json({
			error: 'Internal Server Error',
		});
		return;
	}

	const [task] = runTaskResult.tasks;

	await prisma.ecsTask.create({
		data: {
			taskArn: task.taskArn,
			taskDefinitionArn: task.taskDefinitionArn,
			cpu: task.cpu,
			memory: task.memory,
			status: 'CREATED',
			taskCreatedAt: task.createdAt,
			durationLimit: 300,
			publicIpAddresses: [],
			networkInterfaceIds: [],
			extData: {
				runTaskResult: JSON.parse(JSON.stringify(runTaskResult)),
			},
		}
	});

	res.status(200).json({taskArn: task.taskArn});
}
