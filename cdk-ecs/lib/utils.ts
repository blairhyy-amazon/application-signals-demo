import * as assert from 'assert';
import { ECRPUBLICClient, DescribeRepositoriesCommand } from '@aws-sdk/client-ecr-public';

async function getECRImagePrefix(region: string): Promise<string> {
    // TODO: use ECRClient instead of ECRPublicClient
    const client = new ECRPUBLICClient({ region: region });
    const command = new DescribeRepositoriesCommand({
        repositoryNames: ['traffic-generator'],
    });

    const response = await client.send(command);
    const repositoryUri = response.repositories && response.repositories[0]?.repositoryUri;
    assert(repositoryUri, 'Repository URI is undefined');

    // Extract URI prefix
    return repositoryUri.split('/').slice(0, 2).join('/');
}

async function getLatestAdotJavaTag(): Promise<string> {
    const response = await fetch('https://github.com/aws-observability/aws-otel-java-instrumentation/releases/latest', {
        method: 'HEAD',
        redirect: 'follow',
    });

    // Get the final URL after redirects
    const finalUrl = response.url;

    // Extract the tag from the URL
    return finalUrl.split('/').pop() || '';
}

export { getECRImagePrefix, getLatestAdotJavaTag };
