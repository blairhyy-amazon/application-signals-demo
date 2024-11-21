import * as cdk from 'aws-cdk-lib';
import * as assert from 'assert';

import { getECRImagePrefix, getLatestAdotJavaTag } from './utils';
import { EcsClusterStack } from './stacks/ecsStack';
import { IamRolesStack } from './stacks/iamRolesStack';
import { NetworkStack } from './stacks/networkStack';
import { ServiceDiscoveryStack } from './stacks/servicediscoveryStack';
import { LogStack } from './stacks/logStack';
import { LoadBalancerStack } from './stacks/loadbalancerStack';

class ApplicationSignalsECSDemo {
    private readonly app: cdk.App;
    private ecrImagePrefix: string;
    private adotJavaImageTag: string;
    private ecsClusterStack: EcsClusterStack;
    private serviceDiscoveryStack: ServiceDiscoveryStack;
    private loadbalancerStack: LoadBalancerStack;
    private logStack: LogStack;

    constructor() {
        this.app = new cdk.App();
        this.ecrImagePrefix = '';
        this.adotJavaImageTag = '';
        this.runApp();
    }

    public async runApp(): Promise<void> {
        const ECR_REGION = 'us-east-1';
        const [ecrImagePrefix, adotJavaImageTag] = await Promise.all([
            getECRImagePrefix(ECR_REGION),
            getLatestAdotJavaTag(),
        ]);

        assert(ecrImagePrefix !== '', 'ECR Image Prefix is empty');
        assert(adotJavaImageTag !== '', 'ADOT Java Image Tag is empty');

        this.ecrImagePrefix = ecrImagePrefix;
        this.adotJavaImageTag = adotJavaImageTag;
        console.log(this.adotJavaImageTag);

        // Execute synchronous operations
        this.createStacks();
        this.createServers();
        this.createApiGateway();
        this.runServices();
        this.app.synth();
    }

    private createStacks(): void {
        const networkStack = new NetworkStack(this.app, 'NetworkStack');

        this.logStack = new LogStack(this.app, 'LogStack');

        this.loadbalancerStack = new LoadBalancerStack(this.app, 'LoadBalancerStack', {
            vpc: networkStack.vpc,
            securityGroup: networkStack.securityGroup,
        });

        const iamRolesStack = new IamRolesStack(this.app, 'IamRolesStack');

        this.serviceDiscoveryStack = new ServiceDiscoveryStack(this.app, 'ServiceDiscoveryStack', {
            vpc: networkStack.vpc,
        });

        this.ecsClusterStack = new EcsClusterStack(this.app, 'EcsClusterStack', {
            vpc: networkStack.vpc,
            securityGroups: [networkStack.securityGroup],
            ecsTaskRole: iamRolesStack.ecsTaskRole,
            ecsTaskExecutionRole: iamRolesStack.ecsTaskExecutionRole,
            subnets: networkStack.vpc.publicSubnets,
            ecrImagePrefix: this.ecrImagePrefix,
            serviceDiscoveryStack: this.serviceDiscoveryStack,
            logStack: this.logStack,
        });
    }

    private createServers() {
        this.ecsClusterStack.createConfigServer();
        this.ecsClusterStack.createDiscoveryServer();
        this.ecsClusterStack.createAdminServer();
    }

    private createApiGateway() {
        this.ecsClusterStack.createApiGateway(
            this.loadbalancerStack.loadBalancer.loadBalancerDnsName,
            this.adotJavaImageTag,
        );
    }

    private runServices() {
        this.ecsClusterStack.runVetsService(this.adotJavaImageTag);
        this.ecsClusterStack.runCustomersService(this.adotJavaImageTag);
        this.ecsClusterStack.runVisitsService(this.adotJavaImageTag);
    }
}

new ApplicationSignalsECSDemo();
