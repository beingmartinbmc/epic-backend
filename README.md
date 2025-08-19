# Epic Backend - Religious Guidance API

A modern, scalable backend API for providing religious guidance using OpenAI's GPT models and MongoDB for conversation storage.

## 🚀 Features

- **OpenAI Integration**: Seamless integration with OpenAI's GPT models for religious guidance
- **MongoDB Storage**: Persistent conversation storage with advanced querying capabilities
- **Actuator Monitoring**: Comprehensive health checks, metrics, and observability
- **Serverless Ready**: Optimized for Vercel deployment
- **Modern Architecture**: Clean, maintainable code structure with best practices
- **Security**: CORS protection, input validation, and environment variable masking
- **Error Handling**: Robust error handling with proper logging and monitoring

## 📋 Prerequisites

- Node.js >= 20.0.0
- npm >= 10.0.0
- MongoDB Atlas account (for database)
- OpenAI API key

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd epic-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```env
   # OpenAI Configuration
   OPENAI_API_KEY=your_openai_api_key_here
   OPENAI_MODEL=gpt-3.5-turbo
   OPENAI_TOKEN=1000
   OPENAI_TEMPERATURE=0.8

   # MongoDB Configuration
   mongodb_username=your_mongodb_username
   mongodb_password=your_mongodb_password
   MONGODB_CLUSTER=epic.kcjssht.mongodb.net
   MONGODB_DATABASE=religious-guide

   # Application Configuration
   NODE_ENV=development
   PORT=3000
   ```

4. **Run the application**
   ```bash
   # Development mode
   npm run dev

   # Production mode
   npm start
   ```

## 🏗️ Project Structure

```
epic-backend/
├── src/
│   ├── config/           # Configuration files
│   │   ├── database.js   # MongoDB configuration
│   │   └── actuator.js   # Actuator configuration
│   ├── controllers/      # Request handlers
│   │   └── openai.controller.js
│   ├── middleware/       # Express middleware
│   │   └── cors.js
│   ├── models/          # Data models
│   │   └── conversation.js
│   ├── services/        # Business logic
│   │   └── openai.service.js
│   ├── utils/           # Utility functions
│   ├── tests/           # Test files
│   │   └── test-actuator.js
│   └── index.js         # Main application entry point
├── api/                 # Vercel serverless functions
│   ├── openai-proxy.js
│   └── actuator/
│       └── [...path].js
├── package.json
├── vercel.json
├── .eslintrc.json
├── .prettierrc
└── README.md
```

## 🔧 Available Scripts

| Script | Description |
|--------|-------------|
| `npm start` | Start the production server |
| `npm run dev` | Start development server with Vercel |
| `npm run build` | Run linting and tests |
| `npm run lint` | Run ESLint for code quality |
| `npm run lint:fix` | Fix ESLint issues automatically |
| `npm run format` | Format code with Prettier |
| `npm test` | Run Jest tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run test:actuator` | Test actuator functionality |

## 🌐 API Endpoints

### Core Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | API information and available endpoints |
| `/health` | GET | Application health status |
| `/api/openai-proxy` | POST | OpenAI chat completion proxy |
| `/api/generic` | POST | Custom prompt API |
| `/api/stats` | GET | Conversation statistics |
| `/api/conversations` | GET | Get conversations with pagination |

### Actuator Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/actuator/health` | GET | Detailed health checks |
| `/api/actuator/metrics` | GET | System and custom metrics |
| `/api/actuator/prometheus` | GET | Prometheus-formatted metrics |
| `/api/actuator/info` | GET | Application information |
| `/api/actuator/env` | GET | Environment variables (filtered) |
| `/api/actuator/threaddump` | GET | Event loop analysis |
| `/api/actuator/heapdump` | POST | Generate heap snapshot |

## 📊 Usage Examples

### Custom Prompt API

```javascript
const response = await fetch('/api/generic', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    prompt: 'Explain quantum physics in simple terms',
    context: 'You are a science teacher explaining to a 10-year-old'
  })
});

const result = await response.json();
console.log(result.data.choices[0].message.content);
```

### OpenAI Proxy Request (Legacy)

```javascript
const response = await fetch('/api/openai-proxy', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    messages: [
      {
        role: 'system',
        content: 'You are a religious guidance assistant...'
      },
      {
        role: 'user',
        content: 'I need guidance on dealing with stress...'
      }
    ]
  })
});

const data = await response.json();
```

### Get Conversation Statistics

```javascript
const response = await fetch('/api/stats');
const stats = await response.json();
console.log('Total conversations:', stats.totalConversations);
```

### Get Conversations with Pagination

```javascript
const response = await fetch('/api/conversations?limit=10&skip=0');
const data = await response.json();
console.log('Conversations:', data.conversations);
```

## 🔍 Monitoring & Observability

### Health Checks

The application provides comprehensive health checks for:
- **MongoDB**: Database connectivity and statistics
- **OpenAI API**: API availability and model information
- **Application**: Environment variable validation

### Metrics

Custom metrics are automatically collected:
- `epic_conversations_total`: Total conversations processed
- `epic_response_time_seconds`: OpenAI API response times
- `epic_errors_total`: Total errors encountered

### Prometheus Integration

Metrics are available in Prometheus format for integration with monitoring systems.

## 🚀 Deployment

### Vercel Deployment

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Deploy**
   ```bash
   npm run deploy
   ```

3. **Set environment variables in Vercel dashboard**

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `OPENAI_API_KEY` | OpenAI API key | Yes |
| `OPENAI_MODEL` | GPT model to use | No (default: gpt-3.5-turbo) |
| `OPENAI_TOKEN` | Max tokens for responses | No (default: 1000) |
| `OPENAI_TEMPERATURE` | Response creativity | No (default: 0.8) |
| `mongodb_username` | MongoDB username | Yes |
| `mongodb_password` | MongoDB password | Yes |
| `MONGODB_CLUSTER` | MongoDB cluster URL | No |
| `MONGODB_DATABASE` | Database name | No (default: religious-guide) |
| `NODE_ENV` | Environment | No (default: development) |

## 🧪 Testing

### Run All Tests
```bash
npm test
```

### Run Actuator Tests
```bash
npm run test:actuator
```

### Run Tests with Coverage
```bash
npm run test:coverage
```

## 🔒 Security

- **CORS Protection**: Strict CORS policy - only allows `https://beingmartinbmc.github.io`
- **Input Validation**: Comprehensive request validation
- **Environment Variable Masking**: Sensitive data is masked in logs and endpoints
- **Helmet.js**: Security headers and protection
- **Rate Limiting**: Built-in rate limiting support
- **No Localhost Access**: API is locked down to production domain only

## 📈 Performance

- **Connection Pooling**: Optimized MongoDB connections
- **Compression**: Response compression for better performance
- **Caching**: Built-in caching support
- **Error Recovery**: Retry logic for external API calls

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow ESLint rules and Prettier formatting
- Write tests for new features
- Update documentation as needed
- Use conventional commit messages

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the health endpoints for system status

## 🔄 Changelog

### v1.0.0 (Current)
- Complete refactoring with modern architecture
- Improved error handling and monitoring
- Enhanced security features
- Better code organization and maintainability
- Comprehensive testing setup
- Updated documentation
