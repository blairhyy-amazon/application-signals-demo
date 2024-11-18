import * as assert from 'assert';
import { ECRPUBLICClient, DescribeRepositoriesCommand } from "@aws-sdk/client-ecr-public";

async function getECRImagePrefix(region: string): Promise<string> {
    const client = new ECRPUBLICClient({ region: region });
    const command = new DescribeRepositoriesCommand({
        repositoryNames: ["traffic-generator"]
    });

    const response = await client.send(command);

    try {
        const repositoryUri = response.repositories && response.repositories[0]?.repositoryUri;
        assert (repositoryUri, "Repository URI is undefined");
        // Extract URI prefix
        return repositoryUri.split('/').slice(0, 2).join('/');
    } catch (error) {
        throw error;
    }
}

// // Test
// getECRImagePrefix("us-east-1")
//     .then((prefix) => {console.log(prefix)})
//     .catch((err) => console.error("Error:", err))

export { getECRImagePrefix };