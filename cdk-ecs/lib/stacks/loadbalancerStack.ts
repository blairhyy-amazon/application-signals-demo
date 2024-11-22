import { Stack, StackProps, CfnOutput, Duration } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';

interface LoadBalancerStackProps extends StackProps {
    vpc: ec2.Vpc;
    securityGroup: ec2.SecurityGroup;
}

export class LoadBalancerStack extends Stack {
    public readonly loadBalancer: elbv2.ApplicationLoadBalancer;
    public readonly targetGroup: elbv2.ApplicationTargetGroup;
    private readonly LOAD_BALANCER_NAME = 'ecs-load-balancer';
    private readonly TARGET_GROUP_NAME = 'api-gateway-target-group';

    constructor(scope: Construct, id: string, props: LoadBalancerStackProps) {
        super(scope, id, props);

        // Create Application Load Balancer (ALB)
        this.loadBalancer = new elbv2.ApplicationLoadBalancer(this, 'LoadBalancer', {
            loadBalancerName: this.LOAD_BALANCER_NAME,
            vpc: props.vpc,
            internetFacing: true,
            securityGroup: props.securityGroup,
            vpcSubnets: {
                subnetType: ec2.SubnetType.PUBLIC,
            },
        });

        this.targetGroup = new elbv2.ApplicationTargetGroup(this, 'ApiGatewayTargetGroup', {
            targetGroupName: this.TARGET_GROUP_NAME,
            vpc: props.vpc,
            port: 8080,
            protocol: elbv2.ApplicationProtocol.HTTP,
            targetType: elbv2.TargetType.IP,
            healthCheck: {
                path: '/',
                protocol: elbv2.Protocol.HTTP,
                healthyThresholdCount: 5,
                unhealthyThresholdCount: 2,
                interval: Duration.seconds(240),
                timeout: Duration.seconds(60),
            },
        });

        this.loadBalancer.addListener('Listener', {
            protocol: elbv2.ApplicationProtocol.HTTP,
            port: 80,
            defaultTargetGroups: [this.targetGroup],
        });

        // Output the Load Balancer ARN and DNS
        new CfnOutput(this, 'LoadBalancerARN', {
            value: this.loadBalancer.loadBalancerArn,
        });
        new CfnOutput(this, 'LoadBalancerDNS', {
            value: this.loadBalancer.loadBalancerDnsName,
        });
    }
}
