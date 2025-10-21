package controllers

import (
	"context"
	"time"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"

	aviatrixv1alpha1 "aviatrix-operator/api/v1alpha1"
)

var _ = Describe("AviatrixController Controller", func() {
	Context("When reconciling a resource", func() {
		const resourceName = "test-resource"

		ctx := context.Background()

		typeNamespacedName := types.NamespacedName{
			Name:      resourceName,
			Namespace: "default",
		}
		aviatrixcontroller := &aviatrixv1alpha1.AviatrixController{}

		BeforeEach(func() {
			By("creating the custom resource for the Kind AviatrixController")
			aviatrixcontroller = &aviatrixv1alpha1.AviatrixController{
				ObjectMeta: metav1.ObjectMeta{
					Name:      resourceName,
					Namespace: "default",
				},
				Spec: aviatrixv1alpha1.AviatrixControllerSpec{
					ControllerIP:  "10.0.0.100",
					Username:     "admin",
					Password:     "password123",
					Version:      "6.8",
					CloudType:    "aws",
					AccountName:  "aws-account",
					Region:       "us-west-2",
					CIDR:         "10.0.0.0/16",
					InstanceSize: "t3.medium",
					EnableHA:     false,
					Tags: map[string]string{
						"environment": "production",
						"team":        "networking",
					},
				},
			}

			Expect(k8sClient.Create(ctx, aviatrixcontroller)).Should(Succeed())
		})

		AfterEach(func() {
			resource := &aviatrixv1alpha1.AviatrixController{}
			err := k8sClient.Get(ctx, typeNamespacedName, resource)
			Expect(err).NotTo(HaveOccurred())

			By("Cleanup the specific resource instance AviatrixController")
			Expect(k8sClient.Delete(ctx, resource)).Should(Succeed())
		})
		It("should successfully reconcile the resource", func() {
			By("Reconciling the created resource")
			controllerReconciler := &AviatrixControllerReconciler{
				Client:         k8sClient,
				Scheme:         k8sClient.Scheme(),
				AviatrixClient: mockAviatrixClient,
				CloudManager:   mockCloudManager,
				NetworkManager: mockNetworkManager,
				SecurityManager: mockSecurityManager,
			}

			_, err := controllerReconciler.Reconcile(ctx, reconcileRequest(typeNamespacedName))
			Expect(err).NotTo(HaveOccurred())
		})
	})
})

var _ = Describe("AviatrixGateway Controller", func() {
	Context("When reconciling a resource", func() {
		const resourceName = "test-gateway"

		ctx := context.Background()

		typeNamespacedName := types.NamespacedName{
			Name:      resourceName,
			Namespace: "default",
		}
		aviatrixgateway := &aviatrixv1alpha1.AviatrixGateway{}

		BeforeEach(func() {
			By("creating the custom resource for the Kind AviatrixGateway")
			aviatrixgateway = &aviatrixv1alpha1.AviatrixGateway{
				ObjectMeta: metav1.ObjectMeta{
					Name:      resourceName,
					Namespace: "default",
				},
				Spec: aviatrixv1alpha1.AviatrixGatewaySpec{
					CloudType:    "aws",
					AccountName:  "aws-account",
					GwName:       "aws-gateway",
					VpcID:        "vpc-12345678",
					VpcRegion:    "us-west-2",
					GwSize:       "t3.medium",
					Subnet:       "subnet-12345678",
					EnableNat:    true,
					Tags: map[string]string{
						"environment": "production",
						"team":        "networking",
					},
					HAEnabled: false,
				},
			}

			Expect(k8sClient.Create(ctx, aviatrixgateway)).Should(Succeed())
		})

		AfterEach(func() {
			resource := &aviatrixv1alpha1.AviatrixGateway{}
			err := k8sClient.Get(ctx, typeNamespacedName, resource)
			Expect(err).NotTo(HaveOccurred())

			By("Cleanup the specific resource instance AviatrixGateway")
			Expect(k8sClient.Delete(ctx, resource)).Should(Succeed())
		})
		It("should successfully reconcile the resource", func() {
			By("Reconciling the created resource")
			gatewayReconciler := &AviatrixGatewayReconciler{
				Client:         k8sClient,
				Scheme:         k8sClient.Scheme(),
				AviatrixClient: mockAviatrixClient,
				CloudManager:   mockCloudManager,
			}

			_, err := gatewayReconciler.Reconcile(ctx, reconcileRequest(typeNamespacedName))
			Expect(err).NotTo(HaveOccurred())
		})
	})
})
