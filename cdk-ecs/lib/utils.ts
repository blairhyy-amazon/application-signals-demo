import { ECRPUBLICClient, DescribeRepositoriesCommand } from "@aws-sdk/client-ecr-public";

async function getECRImagePrefix(): Promise<string | undefined> {
    const client = new ECRPUBLICClient({ region: "us-east-1" });
    const command = new DescribeRepositoriesCommand({
        repositoryNames: ["traffic-generator"]
    });

    const response = await client.send(command);

    try {
        if (response.repositories) {
            const repositoryUri = response.repositories[0].repositoryUri;

            // Extract the prefix
            return repositoryUri?.split('/').slice(0, 2).join('/');
        } else {
            return undefined;
        }
    } catch (error) {
        throw error;
    }
}

// getECRImagePrefix()
//     .then((prefix) => {})
//     .catch((err) => console.error("Error:", err))

export { getECRImagePrefix };