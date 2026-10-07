# MACTION CS WhatsApp App Review

Status: implementation in test mode; not approved for existing WhatsApp Business App onboarding. Error 2655111 requires Advanced Access. No production sender connected and no customer automation enabled.

## Requested permissions

- whatsapp_business_messaging: The signed-in workspace administrator selects an approved template and sends a test message from the connected WhatsApp account. A server endpoint validates the session, administrator role, Origin, recipient allowlist and request ID before calling Meta. Delivery statuses and inbound replies are received through an HMAC-verified webhook and shown in the administrator's message log.
- whatsapp_business_management: The administrator lists templates and their approval status, uploads an optional sample image and submits a text or image-header template for Meta review. Course-specific template choices are stored server-side. Only the connected test WABA is accessed during development.

## Reviewer walkthrough

1. Use a separately authorised reviewer login supplied through the private App Review instructions. The workspace is not publicly accessible. Do not publish administrator passwords, tokens or session cookies. Reviewer access is not yet provisioned.
2. Open WhatsApp & AI in the left navigation.
3. The top panel identifies the Meta test sender and the single verified test recipient. Refresh loads template approval statuses and message history.
4. Select hello_world / en_US and send one message to the verified test recipient. Show the phone receiving the message and the workspace request record. "Meta accepted" is distinct from delivered/read and requires a subscribed messages webhook for the latter.
5. In Create template, enter a unique lowercase template name, choose language and MARKETING, enter a sample course invitation with {{1}} and {{2}}, and provide fictional example values. An image is optional. Submit and refresh to show the actual Meta result.
6. Show the project's saved template configuration and its disabled status. Customer automation is not demonstrated as live before opt-in, production credentials and sender onboarding are complete.

## Record two actual videos

- Messaging video: login → test sender/recipient → send approved template → WhatsApp receipt on recipient phone → message record / delivery callback.
- Management video: login → template list → create text/image template with fictional examples → actual Meta creation result and approval status.

Screenshots are not videos. Do not fabricate message receipts, approval status or working automation. Videos and private reviewer access still need to be prepared before submission.

## Remaining production work

- Complete WhatsApp messages webhook configuration and verify actual inbound/status delivery.
- Replace short-lived test token with an appropriately authorised production credential after approval. Secrets stay in Secret Manager.
- Complete App Review and Access Verification as required by Meta's onboarding flow.
- Connect the selected mobile WhatsApp Business number through v4 Business App Onboarding (Coexistence); preserve mobile replies. Eligibility is determined by Meta.
- Establish customer opt-in evidence, per-project sender/template/parameter mapping, durable automation queue and retry handling before enabling automatic customer messages.
- Implement scoped team access to customer conversations; current WhatsApp integration settings and logs are administrator-only.
