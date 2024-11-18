
import {Stack, StackProps, CfnOutput} from "aws-cdk-lib";
import { Construct } from 'constructs';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import {NetworkStack} from "./networkStack";
import {IamRolesStack} from "./iamRolesStack";
import {ServiceDiscoveryStack} from "./servicediscoveryStack";

interface EcsClusterStackProps extends StackProps{
    readonly vpc: ec2.Vpc;
}

export class EcsClusterStack extends Stack {
    public readonly cluster: ecs.Cluster;
    private CLUSTER_NAME = 'ecs-pet-clinic-demo';

    constructor(scope: Construct, id: string, props: EcsClusterStackProps) {
        super(scope, id, props);

        this.cluster = new ecs.Cluster(this, 'EcsCluster', {
            vpc: props.vpc,
            clusterName: this.CLUSTER_NAME,
            enableFargateCapacityProviders: true, // TODO: check
        });

        new CfnOutput(this, 'EcsClusterArn', {value: this.cluster.clusterArn});
    }

    createTaskDefinition(taskDefinitionId: string): ecs.TaskDefinition {
        return new ecs.FargateTaskDefinition(this, taskDefinitionId);
    }

    createService(serviceName: string, taskDefinition: ecs.TaskDefinition, securityGroup: ec2.SecurityGroup, subnetIds: string[], ){
        const ecsService = new ecs.FargateService(this, serviceName, {
            cluster: this.cluster,
            taskDefinition: taskDefinition,
            desiredCount: 1,
            securityGroups: [securityGroup],
            serviceName: serviceName,
            vpcSubnets: {
                subnets: subnetIds.map((subnetId) => ec2.Subnet.fromSubnetId(this, `Subnet-${subnetId}`, subnetId))
            },
            assignPublicIp: true
        });

        new CfnOutput(this, 'ecsService', {value: ecsService.serviceName})
        console.log(`Ecs Service - ${serviceName} is created`)
    }
}