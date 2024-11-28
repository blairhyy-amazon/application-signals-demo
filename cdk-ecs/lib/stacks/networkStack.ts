import { Stack, StackProps, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

export class NetworkStack extends Stack {
    public readonly vpc: ec2.Vpc;
    public readonly rdsSecurityGroup: ec2.SecurityGroup;
    public readonly vpcSecurityGroup: ec2.SecurityGroup;
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
        this.rdsSecurityGroup = new ec2.SecurityGroup(this, this.RDS_SECURITY_GROUP_NAME, {
            vpc: this.vpc,
            securityGroupName: this.RDS_SECURITY_GROUP_NAME,
            allowAllOutbound: true,
        });


        this.vpcSecurityGroup = new ec2.SecurityGroup(this, this.ALB_SECURITY_GROUP_NAME, {
            vpc: this.vpc,
            securityGroupName: this.ALB_SECURITY_GROUP_NAME,
            allowAllOutbound: true,
        });

        this.vpcSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.allTraffic(), 'Allow HTTP traffic');

        this.rdsSecurityGroup.addIngressRule(this.vpcSecurityGroup, ec2.Port.tcp(5432));

        // Output the VPC ID, subnet ID and security group ID
        new CfnOutput(this, 'VPCId', { value: this.vpc.vpcId });
        new CfnOutput(this, 'AlbSecurityGroup', {
            value: this.vpcSecurityGroup.securityGroupId,
        });
        new CfnOutput(this, 'RdsSecurityGroup', {
            value: this.rdsSecurityGroup.securityGroupId,
        });
    }
}
