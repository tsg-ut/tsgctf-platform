import type {VercelRequest, VercelResponse} from '@vercel/node';
import {sql} from '@vercel/postgres';
import type {RunTaskCommandInput, DescribeTasksCommandInput} from '@aws-sdk/client-ecs'
import type {WaiterConfiguration} from "@smithy/util-waiter";
import {ECSClient, RunTaskCommand, waitUntilTasksRunning} from '@aws-sdk/client-ecs'
import {EC2Client, DescribeNetworkInterfacesCommand} from "@aws-sdk/client-ec2";

export default async function handler(req: VercelRequest, res: VercelResponse) {
	const incrementResult = await sql`
		UPDATE counters SET count = count + 1;
	`;

	const {rows: [{count}]} = await sql<{count: number}>`
		SELECT count FROM counters;
	`;

	const ecs = new ECSClient({
		region: 'ap-northeast-1',
		credentials: {
			accessKeyId: process.env.AWS_ACCESS_KEY_ID,
			secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
			sessionToken: process.env.AWS_SESSION_TOKEN,
		},
	});

	const ec2 = new EC2Client({
		region: 'ap-northeast-1',
		credentials: {
			accessKeyId: process.env.AWS_ACCESS_KEY_ID,
			secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
			sessionToken: process.env.AWS_SESSION_TOKEN,
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

	const waiterParams: WaiterConfiguration<ECSClient> = {
		client: ecs,
		maxWaitTime: 5 * 60,
	};

	const waitUntilTasksRunningParams: DescribeTasksCommandInput = {
		cluster: 'tsgctf-test',
		tasks: runTaskResult.tasks?.map(task => task.taskArn) ?? [],
	};

	const waitResult = await waitUntilTasksRunning(waiterParams, waitUntilTasksRunningParams);

	const networkInterfaceIds = waitResult.reason.tasks?.flatMap((task) => (
		task.attachments?.flatMap((attachment) => (
			attachment.details?.filter((detail) => (
				detail.name === 'networkInterfaceId'
			)).map((detail) => detail.value) ?? []
		)) ?? []
	)) ?? [];

	const describeNetworkInterfacesCommand = new DescribeNetworkInterfacesCommand({
		NetworkInterfaceIds: networkInterfaceIds,
	});

	const describeNetworkInterfacesResult = await ec2.send(describeNetworkInterfacesCommand);

	const publicIps = describeNetworkInterfacesResult.NetworkInterfaces?.map((networkInterface) => (
		networkInterface.Association.PublicIp
	)) ?? [];

	res.status(200).json({
		incrementResult,
		message: 'Hello world',
		count,
		runTaskResult,
		waitResult,
		networkInterfaceIds,
		describeNetworkInterfacesResult,
		publicIps,
	});
}