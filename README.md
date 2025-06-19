# WW3 Dashboard - Global Conflict Monitoring System

A comprehensive real-time dashboard for monitoring global conflicts, armed incidents, and geopolitical tensions worldwide.

## 🌍 Features

### Core Functionality
- **Real-time Event Monitoring**: Live feed of global conflict events
- **Interactive World Map**: Geospatial visualization of conflict hotspots
- **Threat Level Assessment**: Automated global threat level calculation
- **Event Categorization**: Filtering by severity, event type, and region
- **Live Metrics**: Key performance indicators and statistics
- **Alert System**: Critical event notifications and warnings

### Data Sources (Planned)
- **ACLED** (Armed Conflict Location & Event Data): Real-time political violence incidents
- **UCDP** (Uppsala Conflict Data Program): Historical conflict data and trends
- **LiveUAMap**: Real-time geospatial conflict feeds
- **CrisisWatch**: Human-curated conflict analysis
- **Global Conflict Tracker**: CFR aggregated conflict data

## 🏗️ Architecture

### Frontend
- **Next.js 15**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first styling
- **Lucide Icons**: Modern icon system

### Components Structure
```
app/
├── components/
│   ├── ui/              # Reusable UI components
│   │   ├── Card.tsx
│   │   ├── Badge.tsx
│   │   └── Button.tsx
│   └── dashboard/       # Dashboard-specific components
│       ├── Header.tsx
│       ├── MetricsOverview.tsx
│       ├── WorldMap.tsx
│       └── EventFeed.tsx
├── types/               # TypeScript definitions
│   └── conflict.ts
├── lib/                 # Utilities and helpers
│   └── utils.ts
└── globals.css          # Global styles and theme
```

## 🎨 Design System

### Color Scheme (Dark Theme)
- **Background**: Slate 950 (`#020617`)
- **Cards**: Slate 900/50 with backdrop blur
- **Text**: Slate 100/400 hierarchy
- **Severity Colors**:
  - Critical: Red 600 (`#dc2626`)
  - High: Amber 500 (`#f59e0b`)
  - Medium: Orange 500 (`#f97316`)
  - Low: Emerald 500 (`#10b981`)

### Typography
- **Primary Font**: Geist Sans
- **Monospace**: Geist Mono

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd ww3-dashboard

# Install dependencies
npm install

# Start development server
npm run dev
```

Visit `http://localhost:3000` to view the dashboard.

## 📊 Current Implementation

### ✅ Completed Features
- [x] Dashboard layout and navigation
- [x] Real-time metrics overview
- [x] Interactive event feed with filtering
- [x] Basic world map visualization
- [x] Threat level assessment system
- [x] Event severity classification
- [x] Responsive design
- [x] Mock data generation for development

### 🔄 In Progress
- [ ] Full Leaflet map integration
- [ ] ACLED API integration
- [ ] UCDP API integration
- [ ] Advanced filtering system
- [ ] Country-specific dashboards
- [ ] Historical trend analysis

### 📋 Planned Features
- [ ] LiveUAMap integration
- [ ] Alert configuration system
- [ ] Email/SMS notifications
- [ ] Export functionality
- [ ] Advanced analytics dashboard
- [ ] Mobile app companion
- [ ] API documentation
- [ ] User authentication
- [ ] Multi-language support

## 🔧 Configuration

### Environment Variables
Create a `.env.local` file:
```env
# API Keys (when implementing real data sources)
ACLED_API_KEY=your_acled_key
UCDP_API_KEY=your_ucdp_key
LIVEUAMAP_API_KEY=your_liveuamap_key

# Database (for storing alerts and user preferences)
DATABASE_URL=your_database_url

# Email notifications
SMTP_HOST=your_smtp_host
SMTP_PORT=587
SMTP_USER=your_email
SMTP_PASS=your_password
```

## 🌐 Data Integration Roadmap

### Phase 1: ACLED Integration
- Real-time event fetching
- Event categorization and severity mapping
- Geolocation and country assignment

### Phase 2: UCDP Integration
- Historical conflict data
- Long-term trend analysis
- Conflict intensity measurements

### Phase 3: LiveUAMap Integration
- Live geospatial feeds
- Social media conflict indicators
- Real-time updates

### Phase 4: Enhanced Analytics
- Machine learning predictions
- Escalation pattern detection
- Risk assessment algorithms

## 🔐 Security Considerations

- API rate limiting
- Data validation and sanitization
- Secure credential management
- CORS configuration
- Content Security Policy

## 📱 Responsive Design

The dashboard is fully responsive and optimized for:
- Desktop (1920px+)
- Laptop (1024px - 1919px)
- Tablet (768px - 1023px)
- Mobile (320px - 767px)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## ⚠️ Disclaimer

This dashboard is for informational purposes only. While we strive for accuracy, the data should not be used as the sole source for critical decisions. Always verify information with official sources.

## 🙏 Acknowledgments

- **ACLED** for conflict data
- **UCDP** for historical datasets
- **LiveUAMap** for real-time feeds
- **Lucide** for icons
- **Tailwind CSS** for styling utilities

---

**Built with ❤️ for global peace monitoring**
# dashboard
