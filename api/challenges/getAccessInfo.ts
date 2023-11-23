import type {VercelRequest, VercelResponse} from '@vercel/node';
import {EC2Client, DescribeNetworkInterfacesCommand} from "@aws-sdk/client-ec2";
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

	const ecsTask = await prisma.ecsTask.findUnique({
		where: {
			taskArn: taskArn,
		},
	});

	if (ecsTask === null) {
		res.status(404).json({
			error: 'Not Found',
		});
		return;
	}

	if (ecsTask.status !== 'RUNNING') {
		res.status(400).json({
			error: 'The task is not running',
		});
		return;
	}

	if (ecsTask.publicIpAddresses.length > 0) {
		res.status(200).json({
			publicIps: ecsTask.publicIpAddresses,
		});
		return;
	}

	const ec2 = new EC2Client({
		region: 'ap-northeast-1',
		credentials: {
			accessKeyId: process.env.AWS_ACCESS_KEY_ID,
			secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
			sessionToken: process.env.AWS_SESSION_TOKEN,
		},
	});

	const describeNetworkInterfacesCommand = new DescribeNetworkInterfacesCommand({
		NetworkInterfaceIds: ecsTask.networkInterfaceIds,
	});

	const describeNetworkInterfacesResult = await ec2.send(describeNetworkInterfacesCommand);

	const publicIps = describeNetworkInterfacesResult.NetworkInterfaces?.map((networkInterface) => (
		networkInterface.Association.PublicIp
	)) ?? [];

	await prisma.ecsTask.update({
		where: {
			taskArn,
		},
		data: {
			publicIpAddresses: publicIps,
		},
	});

	res.status(200).json({
		publicIps,
	});
}
