
import axios from 'axios';
import * as functions from 'firebase-functions';

// Interface for PayPal Access Token response
interface PayPalAccessTokenResponse {
    scope: string;
    access_token: string;
    token_type: string;
    app_id: string;
    expires_in: number;
    nonce: string;
}

export class PayPalClient {
    private clientId: string;
    private clientSecret: string;
    // Dynamic base URL based on environment (Sandbox/Live)
    private baseUrl: string;

    constructor() {
        // Read from Firebase Config functions.config().paypal or process.env (dotenv)
        // We will support both for flexibility
        this.clientId = process.env.PAYPAL_CLIENT_ID || functions.config().paypal?.client_id || '';
        this.clientSecret = process.env.PAYPAL_SECRET || functions.config().paypal?.secret || '';

        const mode = process.env.PAYPAL_MODE || functions.config().paypal?.mode || 'sandbox';
        this.baseUrl = mode === 'live'
            ? 'https://api-m.paypal.com'
            : 'https://api-m.sandbox.paypal.com';

        if (!this.clientId || !this.clientSecret) {
            console.error('PayPal Credentials missing! Check environment variables.');
        }
    }

    /**
     * Generates a new Access Token from PayPal
     */
    private async generateAccessToken(): Promise<string> {
        try {
            const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
            const response = await axios.post<PayPalAccessTokenResponse>(
                `${this.baseUrl}/v1/oauth2/token`,
                'grant_type=client_credentials',
                {
                    headers: {
                        Authorization: `Basic ${auth}`,
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                }
            );
            return response.data.access_token;
        } catch (error: any) {
            console.error('Failed to generate PayPal access token:', error?.response?.data || error.message);
            throw new Error('PayPal Authentication Failed');
        }
    }

    /**
     * Creates an order in PayPal system
     * @param amount The string amount (e.g., "10.00")
     * @param currency Default ILS
     * @param description Short description of item
     */
    public async createOrder(amount: string, description: string = 'Payment', currency: string = 'ILS') {
        const accessToken = await this.generateAccessToken();
        const payload = {
            intent: 'CAPTURE',
            purchase_units: [
                {
                    description: description,
                    amount: {
                        currency_code: currency,
                        value: amount,
                    },
                },
            ],
            payment_source: {
                paypal: {
                    experience_context: {
                        brand_name: "Bein Hasedarim",
                        shipping_preference: "NO_SHIPPING",
                        user_action: "PAY_NOW"
                    }
                }
            }
        };

        try {
            const response = await axios.post(
                `${this.baseUrl}/v2/checkout/orders`,
                payload,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${accessToken}`,
                    },
                }
            );
            return response.data;
        } catch (error: any) {
            console.error('Failed to create PayPal order:', error?.response?.data || error.message);
            throw new Error('Create Order Failed');
        }
    }

    /**
     * Captures an approved order
     * @param orderId PayPal Order ID
     */
    public async captureOrder(orderId: string) {
        const accessToken = await this.generateAccessToken();
        try {
            const response = await axios.post(
                `${this.baseUrl}/v2/checkout/orders/${orderId}/capture`,
                {},
                {
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${accessToken}`,
                    },
                }
            );
            return response.data;
        } catch (error: any) {
            console.error('Failed to capture PayPal order:', error?.response?.data || error.message);
            throw new Error('Capture Order Failed');
        }
    }
}
