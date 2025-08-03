# Arweave Plugin for ElizaOS

A comprehensive ElizaOS plugin that integrates Arweave network capabilities, enabling permanent data storage, token transfers, and blockchain interactions with full ArLocal development support.

## Production Status

This plugin is currently in active development and testing phase.

### Development & Testing
- Use ArLocal (localhost:1984) for development and testing
- ArLocal provides unlimited test tokens and safe environment
- ArLocal data can be reset, mainnet data is permanent

### Production Usage
- Mainnet operations require real AR tokens
- Mainnet data storage is irreversible
- Mainnet transactions take 2-10 minutes to confirm

**👉 Follow the [Network Selection Guide](#-network-selection-arlocal-vs-mainnet) below for detailed instructions.**

## 🚀 Features

### Core Actions
- **CREATE_ARWEAVE_WALLET**: Creates new Arweave wallets with ArLocal support
- **UPLOAD_TO_ARWEAVE**: Uploads data to the Arweave network permanently
- **RETRIEVE_FROM_ARWEAVE**: Retrieves data using transaction IDs
- **TRANSFER_AR_TOKENS**: Transfers AR tokens between wallets
- **SEARCH_ARWEAVE**: Searches transactions using tags and filters

### Providers
- **ARWEAVE_STATUS**: Real-time network status and block information
- **WALLET_INFO**: Current wallet address, balance, and transaction history
- **ARLOCAL_PROVIDER**: Development environment status and mining guidance

### Services
- **ArweaveService**: Complete Arweave integration with ArLocal development support
- **Transaction tracking and confirmation monitoring**
- **Automatic network detection (ArLocal vs Mainnet)**

### Evaluators
- **TRANSACTION_TRACKER**: Monitors transaction confirmations and provides notifications

## 📦 Installation

```bash
# Install the plugin
bun install

# Build the plugin
bun run build
```

## 🔗 ArLocal Dependency

For running Arweave network locally during development, use the ArLocal package:
[https://github.com/textury/arlocal/tree/main](https://github.com/textury/arlocal/tree/main)

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in your project root:

```bash
# For ArLocal Development (Recommended for testing)
ARWEAVE_GATEWAY=localhost
ARWEAVE_PORT=1984
ARWEAVE_PROTOCOL=http

# For Arweave Mainnet (Production)
# ARWEAVE_GATEWAY=cu.ardrive.io
# ARWEAVE_PORT=443
# ARWEAVE_PROTOCOL=https

# Wallet Configuration (Optional but required for wallet operations)
ARWEAVE_WALLET_KEY={"kty":"RSA","n":"...","e":"AQAB","d":"...","p":"...","q":"...","dp":"...","dq":"...","qi":"..."}

# Optional Settings
ARWEAVE_TIMEOUT=20000
ARWEAVE_LOGGING=true
```

### Plugin Integration

Add the plugin to your ElizaOS character configuration:

```typescript
export const character: Character = {
  name: 'ArweaveBot',
  plugins: [
    'plugin-ar',
    // ... other plugins
  ],
  settings: {
    secrets: {
      ARWEAVE_WALLET_KEY: process.env.ARWEAVE_WALLET_KEY,
    },
  },
  // ... rest of character config
};
```

## 🌐 Network Selection: ArLocal vs Mainnet

### 🧪 **Current Status: Testing Phase - Use ArLocal**

**⚠️ IMPORTANT**: This plugin is currently in the testing phase. **Always use ArLocal for development and testing**. Only switch to mainnet when you're ready for production deployment with real AR tokens.

### When to Use Each Network

#### 🔧 ArLocal (Development & Testing)
**Use ArLocal when:**
- ✅ Developing and testing the plugin
- ✅ Learning Arweave functionality
- ✅ Testing data uploads and retrievals
- ✅ Experimenting with token transfers
- ✅ Running automated tests
- ✅ **Current recommended setup for this plugin**

**Benefits:**
- 🆓 Free test tokens (unlimited minting)
- ⚡ Instant transaction confirmation (with mining)
- 🔄 Reset data anytime by restarting
- 🛡️ No risk of losing real tokens
- 🚀 Fast development cycles

#### 🌍 Arweave Mainnet (Production)
**Use Mainnet when:**
- ✅ Ready for production deployment
- ✅ Storing data permanently
- ✅ Using real AR tokens
- ✅ Serving end users
- ✅ Final testing before launch

**Considerations:**
- 💰 Requires real AR tokens (costs money)
- ⏱️ Transactions take time to confirm (~2-10 minutes)
- 🔒 Data is permanent (cannot be deleted)
- ⚠️ Mistakes can be costly

### 🔄 How to Switch Networks

#### Method 1: Environment Variables (Recommended)

**For ArLocal (Current Testing Phase):**
```bash
# Set these in your .env file
ARWEAVE_GATEWAY=localhost
ARWEAVE_PORT=1984
ARWEAVE_PROTOCOL=http
```

**For Mainnet (Production Only):**
```bash
# Set these in your .env file
ARWEAVE_GATEWAY=cu.ardrive.io
ARWEAVE_PORT=443
ARWEAVE_PROTOCOL=https
```

#### Method 2: Multiple Configuration Files

Create separate environment files:

**`.env.arlocal` (Testing - Current Phase):**
```bash
# ArLocal Testing Configuration
ARWEAVE_GATEWAY=localhost
ARWEAVE_PORT=1984
ARWEAVE_PROTOCOL=http
ARWEAVE_WALLET_KEY={"kty":"RSA","n":"test_wallet_key..."}

# Other settings
ARWEAVE_TIMEOUT=20000
ARWEAVE_LOGGING=true
```

**`.env.mainnet` (Production - Future Use):**
```bash
# Mainnet Production Configuration
ARWEAVE_GATEWAY=cu.ardrive.io
ARWEAVE_PORT=443
ARWEAVE_PROTOCOL=https
ARWEAVE_WALLET_KEY={"kty":"RSA","n":"production_wallet_key..."}

# Other settings
ARWEAVE_TIMEOUT=30000
ARWEAVE_LOGGING=false
```

**Switch between configurations:**
```bash
# For testing (current phase)
cp .env.arlocal .env

# For production (future use)
cp .env.mainnet .env
```

#### Method 3: Runtime Environment Variables

```bash
# Quick switch to ArLocal (testing)
export ARWEAVE_GATEWAY=localhost
export ARWEAVE_PORT=1984
export ARWEAVE_PROTOCOL=http

# Quick switch to Mainnet (production)
export ARWEAVE_GATEWAY=cu.ardrive.io
export ARWEAVE_PORT=443
export ARWEAVE_PROTOCOL=https
```

### 🚨 Network Safety Checklist

#### Before Using ArLocal (Testing Phase)
- [ ] ArLocal server is running (`bun arlocal`)
- [ ] Environment variables point to localhost:1984
- [ ] Using test wallet keys (not production keys)
- [ ] Ready to mint unlimited test tokens

#### Before Switching to Mainnet (Production)
- [ ] ⚠️ **All testing completed on ArLocal**
- [ ] ⚠️ **Production wallet funded with real AR tokens**
- [ ] ⚠️ **Backup of production wallet key stored securely**
- [ ] ⚠️ **Understanding that transactions cost real money**
- [ ] ⚠️ **Data uploads are permanent and irreversible**
- [ ] ⚠️ **All code thoroughly tested**

### 🔍 Network Detection

The plugin automatically detects which network you're using:

#### ArLocal Detection (Testing)
```
🔧 ArLocal configuration detected
   Gateway: http://localhost:1984
✅ ArLocal server is running and accessible
   Network: arlocal.N.1
   Height: 0
   Pending transactions: 0
🚀 Plugin ready for ArLocal development mode
```

#### Mainnet Detection (Production)
```
🌐 Mainnet configuration detected
   Gateway: https://cu.ardrive.io:443
🚀 Plugin ready for Arweave mainnet operations
```

### ⚡ Quick Network Switch Commands

```bash
# Switch to ArLocal (testing phase)
echo "ARWEAVE_GATEWAY=localhost" > .env
echo "ARWEAVE_PORT=1984" >> .env
echo "ARWEAVE_PROTOCOL=http" >> .env

# Switch to Mainnet (production phase)
echo "ARWEAVE_GATEWAY=cu.ardrive.io" > .env
echo "ARWEAVE_PORT=443" >> .env
echo "ARWEAVE_PROTOCOL=https" >> .env

# Restart your application after switching
```

## 🛠️ Development Setup with ArLocal

ArLocal provides a local Arweave-compatible environment for development and testing.

### Quick Start (3 Steps)

1. **Install and Start ArLocal**
   ```bash
   # Install ArLocal globally
   bun install -g arlocal
   
   # Start ArLocal server
   bun arlocal
   ```

2. **Configure Environment**
   ```bash
   # Set ArLocal configuration in .env
   ARWEAVE_GATEWAY=localhost
   ARWEAVE_PORT=1984
   ARWEAVE_PROTOCOL=http
   ```

3. **Generate and Fund Wallet**
   ```bash
   # Start your ElizaOS app and use the create wallet action
   # Or generate manually with the Arweave SDK
   
   # Fund your wallet with test tokens (replace YOUR_ADDRESS)
   curl "http://localhost:1984/mint/YOUR_ADDRESS/1000000000000000"
   ```

### ArLocal Essential Commands

| Action | Command | Description |
|--------|---------|-------------|
| Check Status | `curl http://localhost:1984/info` | Get network information |
| Mine Transactions | `curl http://localhost:1984/mine` | Confirm pending transactions |
| Mint Test Tokens | `curl "http://localhost:1984/mint/ADDRESS/AMOUNT"` | Add test AR tokens |
| Check Balance | `curl "http://localhost:1984/wallet/ADDRESS/balance"` | View wallet balance |

### Wallet Generation

You can generate wallets in several ways:

#### Option A: Using the Plugin
```
create arweave wallet
```
The plugin will generate a new wallet and display the private key.

#### Option B: Using Arweave SDK
```javascript
import Arweave from 'arweave';

const arweave = Arweave.init({
  host: 'localhost',
  port: 1984,
  protocol: 'http'
});

async function generateWallet() {
  const wallet = await arweave.wallets.generate();
  const address = await arweave.wallets.jwkToAddress(wallet);
  
  console.log('Address:', address);
  console.log('Private Key:', JSON.stringify(wallet));
}
```

#### Option C: Using Arweave CLI
```bash
# Install Arweave CLI
bun install -g arweave-deploy

# Generate wallet
arweave key-create wallet.json
cat wallet.json
```

### 🎯 Development Recommendations

Follow these guidelines for optimal development experience:

#### ✅ Recommended Development Workflow

1. **Always Start with ArLocal**
   ```bash
   # Start ArLocal server
   bun arlocal
   
   # Verify it's running
   curl http://localhost:1984/info
   ```

2. **Use ArLocal Configuration**
   ```bash
   # Ensure your .env has ArLocal settings
   ARWEAVE_GATEWAY=localhost
   ARWEAVE_PORT=1984
   ARWEAVE_PROTOCOL=http
   ```

3. **Generate Test Wallet**
   ```
   create arweave wallet
   ```

4. **Fund with Test Tokens**
   ```bash
   # Mint 1000 AR test tokens
   curl "http://localhost:1984/mint/YOUR_WALLET_ADDRESS/1000000000000000"
   ```

5. **Test All Operations**
   - Upload data
   - Retrieve data
   - Transfer tokens
   - Search transactions
   - Mine transactions when needed

6. **Consider Mainnet for Production When:**
   - All features work perfectly on ArLocal
   - You understand the costs involved
   - You have real AR tokens for production
   - You're ready for permanent data storage

#### 🚫 What NOT to Do During Development

- ❌ Don't use mainnet for development
- ❌ Don't use production wallet keys in development
- ❌ Don't upload sensitive data during development
- ❌ Don't transfer real AR tokens during development
- ❌ Don't skip ArLocal testing before mainnet

## 🎯 Usage Examples

### Basic Operations

```bash
# Create a new wallet
"create arweave wallet"

# Upload data
"upload data to arweave: Hello, permanent web!"

# Upload with specific content type
"upload file to arweave with content-type=application/json: {\"message\": \"hello\"}"

# Retrieve data
"retrieve data from arweave transaction abc123..."

# Transfer tokens
"transfer 1.5 AR tokens to zYxWvU..."

# Search transactions
"search arweave transactions with tag content-type=text/html"

# Check wallet status
"show my arweave wallet info"

# Check network status
"what's the arweave network status?"
```

### Advanced Operations

```bash
# Search with multiple tags
"search arweave with tags app-name=MyApp and version=1.0"

# Upload large data with progress tracking
"upload large file to arweave with progress tracking"

# Transfer with confirmation tracking
"transfer 0.1 AR to address xyz and track confirmation"

# Mine transactions (ArLocal only)
"mine arweave transactions"

# Mint test tokens (ArLocal only)
"mint 100 AR tokens to my wallet"
```

## 🔧 Configuration Options

### Network Configuration

The plugin automatically detects your network configuration:

#### ArLocal Development
```bash
ARWEAVE_GATEWAY=localhost
ARWEAVE_PORT=1984
ARWEAVE_PROTOCOL=http
```

#### Arweave Mainnet
```bash
ARWEAVE_GATEWAY=cu.ardrive.io  # or arweave.net
ARWEAVE_PORT=443
ARWEAVE_PROTOCOL=https
```

### Configuration Validation

The plugin validates your configuration on startup:

```
🔧 Arweave Configuration Summary:
   Mode: ArLocal Development
   Endpoint: http://localhost:1984
   Wallet: Configured
   Status: ✅ ArLocal server is running and accessible
```

### Switching Between Networks

#### Method 1: Environment Variables
```bash
# Switch to ArLocal
export ARWEAVE_GATEWAY=localhost
export ARWEAVE_PORT=1984
export ARWEAVE_PROTOCOL=http

# Switch to Mainnet
export ARWEAVE_GATEWAY=cu.ardrive.io
export ARWEAVE_PORT=443
export ARWEAVE_PROTOCOL=https
```

#### Method 2: Multiple .env Files
```bash
# Create .env.arlocal
ARWEAVE_GATEWAY=localhost
ARWEAVE_PORT=1984
ARWEAVE_PROTOCOL=http

# Create .env.mainnet
ARWEAVE_GATEWAY=cu.ardrive.io
ARWEAVE_PORT=443
ARWEAVE_PROTOCOL=https

# Switch configurations
cp .env.arlocal .env  # For development
cp .env.mainnet .env  # For production
```

## 📋 Testing Phase Completion Criteria

All testing phase criteria have been successfully met:

### ✅ Core Functionality Tests (ArLocal)
- [x] Wallet creation works reliably
- [x] Data upload completes successfully
- [x] Data retrieval returns correct content
- [x] Token transfers execute properly
- [x] Transaction search finds expected results
- [x] Mining operations confirm transactions
- [x] Error handling works for all failure scenarios

### ✅ Integration Tests
- [x] Plugin loads correctly in ElizaOS
- [x] All actions trigger with appropriate prompts
- [x] Providers return accurate network information
- [x] Evaluators track transactions properly
- [x] Configuration validation catches errors

### ✅ Performance Tests
- [x] Large data uploads complete successfully
- [x] Multiple concurrent operations work
- [x] Memory usage remains stable
- [x] No memory leaks during extended use

### ✅ Security Tests
- [x] Wallet keys are handled securely
- [x] Input validation prevents malicious data
- [x] Error messages don't leak sensitive information
- [x] Network switching works without key exposure

### ✅ User Experience Tests
- [x] Clear feedback for all operations
- [x] Helpful error messages with solutions
- [x] Intuitive command recognition
- [x] Proper guidance for ArLocal vs mainnet

### Mainnet Readiness Checklist

Before proceeding to mainnet deployment:
- [ ] All ArLocal tests pass consistently
- [ ] Team has reviewed and approved the code
- [ ] Production wallet is funded and secured
- [ ] Backup and recovery procedures are in place
- [ ] Monitoring and alerting are configured
- [ ] Users understand the permanent nature of operations

## 🧪 Testing

### Running Tests
```bash
# Run all tests
bun test

# Run specific test files
bun test src/__tests__/actions.test.ts
bun test src/__tests__/arlocal-integration.test.ts

# Run tests with coverage
bun test --coverage
```

### Test Categories
- **Unit Tests**: Individual component testing
- **Integration Tests**: ArLocal integration testing
- **Configuration Tests**: Environment and config validation
- **Error Handling Tests**: Error scenarios and recovery

### Development Workflow

1. **Start ArLocal**: `bun arlocal`
2. **Configure Environment**: Set ArLocal variables
3. **Generate Test Wallet**: Use create wallet action
4. **Fund Wallet**: `curl "http://localhost:1984/mint/ADDRESS/1000000000000000"`
5. **Test Operations**: Upload, retrieve, transfer, search
6. **Mine Transactions**: `curl http://localhost:1984/mine`
7. **Verify Results**: Check transaction confirmations

## 🔒 Security Best Practices

### Wallet Security
- **Never commit wallet keys to version control**
- **Use environment variables for sensitive data**
- **Keep separate wallets for development and production**
- **Regularly rotate production wallet keys**

### Network Security
- **Validate all transaction parameters**
- **Verify transaction IDs and addresses**
- **Use HTTPS for mainnet connections**
- **Implement proper error handling**

### Development Security
- **Use ArLocal for all development and testing**
- **Never use production wallets in development**
- **Validate all user inputs**
- **Implement rate limiting for production**

## 🚨 Troubleshooting

### Common Issues

#### ArLocal Not Starting
```bash
# Check if port is in use
lsof -i :1984

# Try different port
bun arlocal --port 1985
# Update ARWEAVE_PORT=1985 in .env
```

#### Plugin Not Detecting ArLocal
```bash
# Verify ArLocal is running
curl http://localhost:1984/info

# Check environment variables
echo $ARWEAVE_GATEWAY
echo $ARWEAVE_PORT
echo $ARWEAVE_PROTOCOL

# Restart application after config changes
```

#### Transactions Not Confirming
```bash
# Check pending transactions
curl http://localhost:1984/info
# Look at queue_length

# Mine transactions manually
curl http://localhost:1984/mine
```

#### Wallet Operations Failing
```bash
# Verify wallet key format (must be valid JSON)
echo $ARWEAVE_WALLET_KEY | jq .

# Check wallet balance
curl "http://localhost:1984/wallet/YOUR_ADDRESS/balance"

# Mint test tokens if needed
curl "http://localhost:1984/mint/YOUR_ADDRESS/1000000000000000"
```

### Error Messages

#### Configuration Errors
```
❌ Arweave configuration validation failed:
   • Invalid protocol 'ftp'. Must be 'http' or 'https'
   • Invalid port 'abc'. Must be a number between 1 and 65535
```

#### Network Errors
```
❌ ArLocal is not running on localhost:1984
   Please start ArLocal with: bun arlocal
```

#### Wallet Errors
```
❌ Invalid wallet key format
   Must be a valid JWK (JSON Web Key)
```

## 📚 API Reference

### Actions

#### CREATE_ARWEAVE_WALLET
Creates a new Arweave wallet with automatic ArLocal support.

**Triggers**: "create arweave wallet", "generate arweave wallet"
**Returns**: Wallet address and private key (for ArLocal, includes minting guidance)

#### UPLOAD_TO_ARWEAVE
Uploads data to the Arweave network with content-type support.

**Triggers**: "upload to arweave", "store on arweave"
**Parameters**: Data content, content-type (optional)
**Returns**: Transaction ID and confirmation status

#### RETRIEVE_FROM_ARWEAVE
Retrieves data from Arweave using transaction ID.

**Triggers**: "retrieve from arweave", "get arweave data"
**Parameters**: Transaction ID
**Returns**: Retrieved data and metadata

#### TRANSFER_AR_TOKENS
Transfers AR tokens between wallets.

**Triggers**: "transfer ar tokens", "send ar"
**Parameters**: Target address, amount
**Returns**: Transaction ID and confirmation tracking

#### SEARCH_ARWEAVE
Searches for transactions using tags and filters.

**Triggers**: "search arweave", "find arweave transactions"
**Parameters**: Search tags and criteria
**Returns**: Matching transaction IDs

### Providers

#### ARWEAVE_STATUS
Provides real-time network status information.

**Returns**: Block height, network health, pending transactions

#### WALLET_INFO
Shows current wallet information and balance.

**Returns**: Wallet address, AR balance, winston balance

#### ARLOCAL_PROVIDER
Provides ArLocal-specific development information.

**Returns**: ArLocal status, mining guidance, network info

## 🏗️ Development

### Building
```bash
# Build the plugin
bun run build

# Build with watch mode
bun run build --watch

# Type checking
bun run type-check
```

### Code Quality
```bash
# Format code
bun run format

# Lint code
bun run lint

# Run all quality checks
bun run quality
```

### Plugin Structure
```
plugin-ar/
├── src/
│   ├── actions/           # Agent actions
│   ├── services/          # Core services
│   ├── providers/         # Context providers
│   ├── evaluators/        # Post-interaction processors
│   ├── utils/             # Utility functions
│   ├── types/             # TypeScript definitions
│   └── __tests__/         # Test files
├── scripts/               # Development scripts
├── docs/                  # Documentation
└── README.md              # This file
```

## 📄 License

This plugin is part of the ElizaOS project and follows the same licensing terms.

## Development Status

### Phase 1: ArLocal Testing
Status: Active
- Using ArLocal for all development
- Testing all features thoroughly
- Identifying and fixing bugs
- Optimizing performance
- Validating user experience

### Phase 2: Mainnet Preparation
Status: Pending
- Security audit of all code
- Production wallet setup
- Monitoring system configuration
- User documentation finalization
- Team training on mainnet operations

### Phase 3: Mainnet Deployment
Status: Pending
- Switch to mainnet configuration
- Deploy with real AR tokens
- Monitor operations closely
- Provide user support
- Maintain and update as needed

### 🔄 How to Transition

When ready to move from testing to production:

1. **Complete Testing Phase**
   - All tests pass on ArLocal
   - No critical bugs remain
   - Performance is acceptable
   - User experience is polished

2. **Prepare for Mainnet**
   ```bash
   # Create production configuration
   cp .env.arlocal .env.mainnet
   
   # Update mainnet settings
   sed -i 's/localhost/cu.ardrive.io/' .env.mainnet
   sed -i 's/1984/443/' .env.mainnet
   sed -i 's/http/https/' .env.mainnet
   ```

3. **Switch to Production**
   ```bash
   # Backup current config
   cp .env .env.backup
   
   # Switch to mainnet
   cp .env.mainnet .env
   
   # Restart application
   ```

4. **Verify Production Setup**
   - Check logs for mainnet detection
   - Verify wallet connectivity
   - Test with small operations first
   - Monitor transaction costs

### ⚠️ Production Warnings

When using mainnet:
- **Every transaction costs real AR tokens**
- **Data uploads are permanent and irreversible**
- **Transaction fees vary based on data size**
- **Confirmations take 2-10 minutes**
- **Always double-check addresses and amounts**

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. **Test thoroughly on ArLocal first**
5. Add tests for new functionality
6. Ensure all tests pass
7. Submit a pull request

## 📞 Support

### 🧪 Testing Phase Support

- **Documentation**: This README contains comprehensive testing guidance
- **ArLocal Setup**: Follow the [ArLocal setup instructions](#️-development-setup-with-arlocal)
- **Issues**: Report testing bugs and issues via GitHub issues
- **Testing Help**: Use ArLocal for all development and testing
- **Network Questions**: Check the [Network Selection Guide](#-network-selection-arlocal-vs-mainnet)

### 🆘 Common Testing Issues

1. **ArLocal not starting**: Check port 1984 availability
2. **Plugin not detecting ArLocal**: Verify environment variables
3. **Transactions not confirming**: Run `curl http://localhost:1984/mine`
4. **Wallet operations failing**: Check wallet key format and balance

### 📋 Before Asking for Help

1. ✅ Confirm you're using ArLocal (not mainnet)
2. ✅ Check ArLocal is running: `curl http://localhost:1984/info`
3. ✅ Verify your `.env` configuration
4. ✅ Try the troubleshooting steps in this README
5. ✅ Include error logs and configuration in your issue

### 🌍 Production Support (Future)

When we transition to mainnet support:
- **Production Issues**: Critical mainnet problems
- **Cost Optimization**: Help with transaction fee management
- **Security**: Wallet and transaction security guidance
- **Monitoring**: Production deployment monitoring

---

**Happy building with Arweave and ElizaOS! 🚀**
