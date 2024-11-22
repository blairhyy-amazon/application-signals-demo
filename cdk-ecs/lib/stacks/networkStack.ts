import { Stack, StackProps, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

export class NetworkStack extends Stack {
    public readonly vpc: ec2.Vpc;
    public readonly ecsSecurityGroup: ec2.SecurityGroup;
    public readonly rdsSecurityGroup: ec2.SecurityGroup;
    public readonly albSecurityGroup: ec2.SecurityGroup;
    private readonly ECS_SECURITY_GROUP_NAME = 'ecs-security-group';
    private readonly RDS_SECURITY_GROUP_NAME = 'rds-security-group';
    private readonly ALB_SECURITY_GROUP_NAME = 'alb-security-group';

    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        // Create VPC
        this.vpc = new ec2.Vpc(this, 'VPC', {
            maxAzs: 2,
            subnetConfiguration: [
                {
                    name: 'public-subnet',
                    subnetType: ec2.SubnetType.PUBLIC,
                    cidrMask: 24,
                },
                {
                    name: 'private-subnet',
                    subnetType: ec2.SubnetType.PRIVATE_ISOLATED, // Completely isolated private subnet
                    cidrMask: 24,
                },
            ],
        });

        // Create Security Groups
        this.ecsSecurityGroup = new ec2.SecurityGroup(this, this.ECS_SECURITY_GROUP_NAME, {
            vpc: this.vpc,
            securityGroupName: this.ECS_SECURITY_GROUP_NAME,
            allowAllOutbound: true,
        });

        // Allow Config, Discovery, Admin, Api-Gateway server traffic within security group
        [8888, 8761, 9090, 8080].forEach((port) => {
            this.ecsSecurityGroup.connections.allowInternally(
                ec2.Port.tcp(port),
                `Allow internal traffic on port ${port}`,
            );
        });

        // Allow Vets, Customers, Visits, Insurance, Billing services traffic within security group
        [8083, 8081, 8082, 8000, 8800].forEach((port) => {
            this.ecsSecurityGroup.connections.allowInternally(
                ec2.Port.tcp(port),
                `Allow internal traffic on port ${port}`,
            );
        });

        this.rdsSecurityGroup = new ec2.SecurityGroup(this, this.RDS_SECURITY_GROUP_NAME, {
            vpc: this.vpc,
            securityGroupName: this.RDS_SECURITY_GROUP_NAME,
            allowAllOutbound: true,
        });

        this.rdsSecurityGroup.addIngressRule(this.ecsSecurityGroup, ec2.Port.tcp(5432));

        this.albSecurityGroup = new ec2.SecurityGroup(this, this.ALB_SECURITY_GROUP_NAME, {
            vpc: this.vpc,
            securityGroupName: this.ALB_SECURITY_GROUP_NAME,
            allowAllOutbound: true,
        });

        this.albSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80), 'Allow HTTP traffic');

        // Allow ALB to communicate with EC2 instances on necessary ports
        [80, 8080].forEach((port) => {
            this.ecsSecurityGroup.addIngressRule(
                this.albSecurityGroup,
                ec2.Port.tcp(port),
                `Allow traffic from ALB on port ${port}`,
            );
        });

        // Output the VPC ID, subnet ID and security group ID
        new CfnOutput(this, 'VPCId', { value: this.vpc.vpcId });
        new CfnOutput(this, 'EcsSecurityGroup', {
            value: this.ecsSecurityGroup.securityGroupId,
        });
        new CfnOutput(this, 'RdsSecurityGroup', {
            value: this.rdsSecurityGroup.securityGroupId,
        });
    }
}
