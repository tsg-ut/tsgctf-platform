import type {VercelRequest, VercelResponse} from '@vercel/node';
import type {DescribeTasksCommandInput} from '@aws-sdk/client-ecs';
import type {WaiterConfiguration, WaiterResult} from "@smithy/util-waiter";
import {ECSClient, waitUntilTasksRunning} from '@aws-sdk/client-ecs';
import {PrismaClient} from '@prisma/client';

const prisma = new PrismaClient()

export default async function handler(req: VercelRequest, res: VercelResponse) {
	if (req.method !== 'POST') {
		res.status(405).json({
			error: 'Method Not Allowed',
		});
		return;
	}

	const taskArn = req.body.taskArn;

	if (typeof taskArn !== 'string' || taskArn.length === 0) {
		res.status(400).json({
			error: 'Bad Request',
		});
		return;
	}

	const ecs = new ECSClient({
		region: 'ap-northeast-1',
		credentials: {
			accessKeyId: process.env.AWS_ACCESS_KEY_ID,
			secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
			sessionToken: process.env.AWS_SESSION_TOKEN,
		},
	});

	const waiterParams: WaiterConfiguration<ECSClient> = {
		client: ecs,
		maxWaitTime: 5,
		minDelay: 3,
	};

	const waitUntilTasksRunningParams: DescribeTasksCommandInput = {
		cluster: 'tsgctf-test',
		tasks: [taskArn],
	};

	let waitResult: WaiterResult;
	try {
		waitResult = await waitUntilTasksRunning(waiterParams, waitUntilTasksRunningParams);
	} catch (e) {
		if (e.name === 'TimeoutError') {
			res.status(202).json({
				status: 'provisioning',
			});
			return;
		}
		throw e;
	}

	const taskData = waitResult.reason.tasks?.find((taskData) => (
		taskData.taskArn === taskArn
	));

	if (!taskData) {
		throw new Error(`Task not found: ${taskArn}`);
	}

	const networkInterfaceIds: string[] =
		taskData.attachments?.flatMap((attachment) => (
			attachment.details?.filter((detail) => (
				detail.name === 'networkInterfaceId'
			)).map((detail) => detail.value) ?? []
		)) ?? [];

	await prisma.ecsTask.update({
		where: {
			taskArn,
		},
		data: {
			status: 'RUNNING',
			taskStartedAt: new Date(),
			networkInterfaceIds,
		},
	});

	res.status(200).json({
		status: 'ready',
	});
}
