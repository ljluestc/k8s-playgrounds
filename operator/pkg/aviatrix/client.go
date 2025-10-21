package aviatrix

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// Client represents an Aviatrix API client
type Client struct {
	ControllerIP string
	Username     string
	Password     string
	HTTPClient   *http.Client
	SessionID    string
}

// NewClient creates a new Aviatrix client
func NewClient(controllerIP, username, password string) (*Client, error) {
	client := &Client{
		ControllerIP: controllerIP,
		Username:     username,
		Password:     password,
		HTTPClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}

	// Login to get session ID
	if err := client.Login(); err != nil {
		return nil, fmt.Errorf("failed to login: %w", err)
	}

	return client, nil
}

// Login authenticates with the Aviatrix Controller
func (c *Client) Login() error {
	loginData := map[string]string{
		"action":   "login",
		"username": c.Username,
		"password": c.Password,
	}

	resp, err := c.makeRequest("POST", "/v1/api", loginData)
	if err != nil {
		return err
	}

	var result map[string]interface{}
	if err := json.Unmarshal(resp, &result); err != nil {
		return err
	}

	if result["return"] == true {
		c.SessionID = result["CID"].(string)
		return nil
	}

	return fmt.Errorf("login failed: %s", result["reason"])
}

// Logout logs out from the Aviatrix Controller
func (c *Client) Logout() error {
	logoutData := map[string]string{
		"action": "logout",
		"CID":    c.SessionID,
	}

	_, err := c.makeRequest("POST", "/v1/api", logoutData)
	return err
}

// makeRequest makes an HTTP request to the Aviatrix Controller
func (c *Client) makeRequest(method, endpoint string, data interface{}) ([]byte, error) {
	url := fmt.Sprintf("https://%s%s", c.ControllerIP, endpoint)

	var body io.Reader
	if data != nil {
		jsonData, err := json.Marshal(data)
		if err != nil {
			return nil, err
		}
		body = bytes.NewBuffer(jsonData)
	}

	req, err := http.NewRequest(method, url, body)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Content-Type", "application/json")

	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	return io.ReadAll(resp.Body)
}

// CreateGateway creates a new gateway
func (c *Client) CreateGateway(gwName, cloudType, accountName, vpcID, vpcRegion, gwSize, subnet string) error {
	data := map[string]interface{}{
		"action":     "create_gateway",
		"CID":        c.SessionID,
		"gw_name":    gwName,
		"cloud_type": cloudType,
		"account_name": accountName,
		"vpc_id":     vpcID,
		"vpc_reg":    vpcRegion,
		"gw_size":    gwSize,
		"subnet":     subnet,
	}

	resp, err := c.makeRequest("POST", "/v1/api", data)
	if err != nil {
		return err
	}

	var result map[string]interface{}
	if err := json.Unmarshal(resp, &result); err != nil {
		return err
	}

	if result["return"] != true {
		return fmt.Errorf("failed to create gateway: %s", result["reason"])
	}

	return nil
}

// DeleteGateway deletes a gateway
func (c *Client) DeleteGateway(gwName string) error {
	data := map[string]string{
		"action":  "delete_gateway",
		"CID":     c.SessionID,
		"gw_name": gwName,
	}

	resp, err := c.makeRequest("POST", "/v1/api", data)
	if err != nil {
		return err
	}

	var result map[string]interface{}
	if err := json.Unmarshal(resp, &result); err != nil {
		return err
	}

	if result["return"] != true {
		return fmt.Errorf("failed to delete gateway: %s", result["reason"])
	}

	return nil
}

// GetGateway retrieves gateway information
func (c *Client) GetGateway(gwName string) (map[string]interface{}, error) {
	data := map[string]string{
		"action":  "get_gateway_info",
		"CID":     c.SessionID,
		"gw_name": gwName,
	}

	resp, err := c.makeRequest("POST", "/v1/api", data)
	if err != nil {
		return nil, err
	}

	var result map[string]interface{}
	if err := json.Unmarshal(resp, &result); err != nil {
		return nil, err
	}

	if result["return"] != true {
		return nil, fmt.Errorf("failed to get gateway: %s", result["reason"])
	}

	return result, nil
}

// CreateVpc creates a new VPC
func (c *Client) CreateVpc(name, cloudType, accountName, region, cidr string) error {
	data := map[string]string{
		"action":       "create_vpc",
		"CID":          c.SessionID,
		"name":         name,
		"cloud_type":   cloudType,
		"account_name": accountName,
		"region":       region,
		"cidr":         cidr,
	}

	resp, err := c.makeRequest("POST", "/v1/api", data)
	if err != nil {
		return err
	}

	var result map[string]interface{}
	if err := json.Unmarshal(resp, &result); err != nil {
		return err
	}

	if result["return"] != true {
		return fmt.Errorf("failed to create VPC: %s", result["reason"])
	}

	return nil
}

// DeleteVpc deletes a VPC
func (c *Client) DeleteVpc(name string) error {
	data := map[string]string{
		"action": "delete_vpc",
		"CID":    c.SessionID,
		"name":   name,
	}

	resp, err := c.makeRequest("POST", "/v1/api", data)
	if err != nil {
		return err
	}

	var result map[string]interface{}
	if err := json.Unmarshal(resp, &result); err != nil {
		return err
	}

	if result["return"] != true {
		return fmt.Errorf("failed to delete VPC: %s", result["reason"])
	}

	return nil
}

// GetVpc retrieves VPC information
func (c *Client) GetVpc(name string) (map[string]interface{}, error) {
	data := map[string]string{
		"action": "get_vpc_info",
		"CID":    c.SessionID,
		"name":   name,
	}

	resp, err := c.makeRequest("POST", "/v1/api", data)
	if err != nil {
		return nil, err
	}

	var result map[string]interface{}
	if err := json.Unmarshal(resp, &result); err != nil {
		return nil, err
	}

	if result["return"] != true {
		return nil, fmt.Errorf("failed to get VPC: %s", result["reason"])
	}

	return result, nil
}

// CreateFirewall creates firewall rules
func (c *Client) CreateFirewall(gwName, basePolicy string, rules []map[string]interface{}) error {
	data := map[string]interface{}{
		"action":      "set_firewall",
		"CID":         c.SessionID,
		"gw_name":     gwName,
		"base_policy": basePolicy,
		"rules":       rules,
	}

	resp, err := c.makeRequest("POST", "/v1/api", data)
	if err != nil {
		return err
	}

	var result map[string]interface{}
	if err := json.Unmarshal(resp, &result); err != nil {
		return err
	}

	if result["return"] != true {
		return fmt.Errorf("failed to create firewall: %s", result["reason"])
	}

	return nil
}

// DeleteFirewall deletes firewall rules
func (c *Client) DeleteFirewall(gwName string) error {
	data := map[string]string{
		"action":  "delete_firewall",
		"CID":     c.SessionID,
		"gw_name": gwName,
	}

	resp, err := c.makeRequest("POST", "/v1/api", data)
	if err != nil {
		return err
	}

	var result map[string]interface{}
	if err := json.Unmarshal(resp, &result); err != nil {
		return err
	}

	if result["return"] != true {
		return fmt.Errorf("failed to delete firewall: %s", result["reason"])
	}

	return nil
}

// GetFirewall retrieves firewall rules
func (c *Client) GetFirewall(gwName string) (map[string]interface{}, error) {
	data := map[string]string{
		"action":  "get_firewall",
		"CID":     c.SessionID,
		"gw_name": gwName,
	}

	resp, err := c.makeRequest("POST", "/v1/api", data)
	if err != nil {
		return nil, err
	}

	var result map[string]interface{}
	if err := json.Unmarshal(resp, &result); err != nil {
		return nil, err
	}

	if result["return"] != true {
		return nil, fmt.Errorf("failed to get firewall: %s", result["reason"])
	}

	return result, nil
}
