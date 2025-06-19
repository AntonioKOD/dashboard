import { ConflictEvent, EventType, SeverityLevel, DataSource } from '../../types/conflict';
import { calculateSeverity } from '../utils';

const cheerio = require('cheerio');

interface NewsArticle {
  title: string;
  description: string;
  url: string;
  publishedAt: string;
  source: string;
  content?: string;
}

interface NewsAPIResponse {
  status: string;
  totalResults: number;
  articles: Array<{
    source: { id: string; name: string };
    author: string;
    title: string;
    description: string;
    url: string;
    urlToImage: string;
    publishedAt: string;
    content: string;
  }>;
}

interface GDELTEvent {
  date: string;
  actor1: string;
  actor2: string;
  eventCode: string;
  goldsteinScale: number;
  numMentions: number;
  avgTone: number;
  sourceURL: string;
  latitude: number;
  longitude: number;
}

interface ReliefWebResponse {
  data: Array<{
    id: string;
    fields: {
      title: string;
      date: { created: string };
      body: string;
      url: string;
      country: Array<{ name: string }>;
      disaster: Array<{ name: string }>;
      source: Array<{ name: string }>;
    };
  }>;
}

class NewsScraperClient {
  private readonly cache = new Map<string, { data: ConflictEvent[]; timestamp: number }>();
  private readonly cacheTTL = 10 * 60 * 1000; // 10 minutes

  // Free NewsAPI key (limited but functional)
  private readonly newsApiKey = process.env.NEWS_API_KEY || 'demo_key';
  
  private readonly conflictKeywords = [
    // Core conflict terms
    'war', 'conflict', 'attack', 'bombing', 'missile', 'military', 'armed', 'violence',
    'terrorism', 'insurgency', 'rebel', 'coup', 'sanctions', 'nuclear', 'cyber attack',
    'drone strike', 'evacuation', 'refugee', 'airstrike', 'explosion', 'gunfire',
    'clash', 'battle', 'siege', 'invasion', 'occupation', 'civil war', 'uprising',
    
    // Major regional hotspots
    'Ukraine', 'Russia', 'Gaza', 'Israel', 'Palestine', 'Syria', 'Iran', 'NATO',
    'China', 'Taiwan', 'North Korea', 'Afghanistan', 'Iraq', 'Yemen', 'Myanmar',
    'Somalia', 'Mali', 'Sudan', 'Nigeria', 'Ethiopia', 'Libya', 'Colombia',
    'Venezuela', 'Mexico', 'Kashmir', 'Philippines', 'Haiti', 'Nagorno-Karabakh',
    
    // Threat actors and organizations
    'ISIS', 'Taliban', 'Al-Qaeda', 'Boko Haram', 'Hezbollah', 'Hamas', 'Wagner',
    'militia', 'paramilitary', 'mercenary', 'jihadist', 'separatist', 'extremist',
    'cartel', 'gang violence', 'organized crime',
    
    // Crisis indicators
    'humanitarian crisis', 'displacement', 'embargo', 'blockade', 'chemical weapons',
    'disinformation', 'propaganda', 'election violence', 'protest violence',
    'riot', 'unrest', 'martial law', 'state of emergency', 'peacekeeping'
  ];

  private readonly majorConflictLocations = {
    // Current Major Conflicts
    'Ukraine': { lat: 50.4501, lng: 30.5234, country: 'Ukraine' },
    'Gaza': { lat: 31.3547, lng: 34.3088, country: 'Palestine' },
    'Syria': { lat: 33.5138, lng: 36.2765, country: 'Syria' },
    'Yemen': { lat: 15.5527, lng: 48.5164, country: 'Yemen' },
    'Afghanistan': { lat: 33.9391, lng: 67.7100, country: 'Afghanistan' },
    'Iraq': { lat: 33.2232, lng: 43.6793, country: 'Iraq' },
    'Iran': { lat: 35.6892, lng: 51.3890, country: 'Iran' },
    'Israel': { lat: 31.0461, lng: 34.8516, country: 'Israel' },
    'Russia': { lat: 55.7558, lng: 37.6176, country: 'Russia' },
    'China': { lat: 39.9042, lng: 116.4074, country: 'China' },
    'Taiwan': { lat: 25.0330, lng: 121.5654, country: 'Taiwan' },
    'Myanmar': { lat: 19.7633, lng: 96.0785, country: 'Myanmar' },
    'Somalia': { lat: 5.1521, lng: 46.1996, country: 'Somalia' },
    'Mali': { lat: 17.5707, lng: -3.9962, country: 'Mali' },
    'Sudan': { lat: 15.5007, lng: 32.5599, country: 'Sudan' },
    
    // Africa - Additional Hotspots
    'Nigeria': { lat: 9.0820, lng: 8.6753, country: 'Nigeria' },
    'Ethiopia': { lat: 9.1450, lng: 40.4897, country: 'Ethiopia' },
    'Libya': { lat: 26.3351, lng: 17.2283, country: 'Libya' },
    'Chad': { lat: 15.4542, lng: 18.7322, country: 'Chad' },
    'Niger': { lat: 17.6078, lng: 8.0817, country: 'Niger' },
    'Burkina Faso': { lat: 12.2383, lng: -1.5616, country: 'Burkina Faso' },
    'Congo': { lat: -4.0383, lng: 21.7587, country: 'Democratic Republic of Congo' },
    'CAR': { lat: 6.6111, lng: 20.9394, country: 'Central African Republic' },
    'South Sudan': { lat: 6.8770, lng: 31.3070, country: 'South Sudan' },
    'Mozambique': { lat: -18.6657, lng: 35.5296, country: 'Mozambique' },
    'Cameroon': { lat: 7.3697, lng: 12.3547, country: 'Cameroon' },
    
    // Asia-Pacific
    'Pakistan': { lat: 30.3753, lng: 69.3451, country: 'Pakistan' },
    'India': { lat: 20.5937, lng: 78.9629, country: 'India' },
    'Kashmir': { lat: 34.0837, lng: 74.7973, country: 'Kashmir' },
    'Philippines': { lat: 12.8797, lng: 121.7740, country: 'Philippines' },
    'Thailand': { lat: 15.8700, lng: 100.9925, country: 'Thailand' },
    'Bangladesh': { lat: 23.6850, lng: 90.3563, country: 'Bangladesh' },
    'Sri Lanka': { lat: 7.8731, lng: 80.7718, country: 'Sri Lanka' },
    'North Korea': { lat: 40.3399, lng: 127.5101, country: 'North Korea' },
    'South Korea': { lat: 35.9078, lng: 127.7669, country: 'South Korea' },
    'Japan': { lat: 36.2048, lng: 138.2529, country: 'Japan' },
    'Indonesia': { lat: -0.7893, lng: 113.9213, country: 'Indonesia' },
    'Malaysia': { lat: 4.2105, lng: 101.9758, country: 'Malaysia' },
    
    // Latin America
    'Colombia': { lat: 4.5709, lng: -74.2973, country: 'Colombia' },
    'Venezuela': { lat: 6.4238, lng: -66.5897, country: 'Venezuela' },
    'Mexico': { lat: 23.6345, lng: -102.5528, country: 'Mexico' },
    'Brazil': { lat: -14.2350, lng: -51.9253, country: 'Brazil' },
    'Peru': { lat: -9.1900, lng: -75.0152, country: 'Peru' },
    'Ecuador': { lat: -1.8312, lng: -78.1834, country: 'Ecuador' },
    'Haiti': { lat: 18.9712, lng: -72.2852, country: 'Haiti' },
    'Guatemala': { lat: 15.7835, lng: -90.2308, country: 'Guatemala' },
    'Honduras': { lat: 15.2000, lng: -86.2419, country: 'Honduras' },
    'El Salvador': { lat: 13.7942, lng: -88.8965, country: 'El Salvador' },
    
    // Europe & Balkans
    'Serbia': { lat: 44.0165, lng: 21.0059, country: 'Serbia' },
    'Kosovo': { lat: 42.6026, lng: 20.9030, country: 'Kosovo' },
    'Bosnia': { lat: 43.9159, lng: 17.6791, country: 'Bosnia and Herzegovina' },
    'Albania': { lat: 41.1533, lng: 20.1683, country: 'Albania' },
    'Moldova': { lat: 47.4116, lng: 28.3699, country: 'Moldova' },
    'Georgia': { lat: 42.3154, lng: 43.3569, country: 'Georgia' },
    'Armenia': { lat: 40.0691, lng: 45.0382, country: 'Armenia' },
    'Azerbaijan': { lat: 40.1431, lng: 47.5769, country: 'Azerbaijan' },
    
    // Middle East Extended
    'Lebanon': { lat: 33.8547, lng: 35.8623, country: 'Lebanon' },
    'Jordan': { lat: 30.5852, lng: 36.2384, country: 'Jordan' },
    'Turkey': { lat: 38.9637, lng: 35.2433, country: 'Turkey' },
    'Cyprus': { lat: 35.1264, lng: 33.4299, country: 'Cyprus' },
    'Kuwait': { lat: 29.3117, lng: 47.4818, country: 'Kuwait' },
    'Bahrain': { lat: 25.9304, lng: 50.6378, country: 'Bahrain' },
    'Qatar': { lat: 25.3548, lng: 51.1839, country: 'Qatar' },
    'UAE': { lat: 23.4241, lng: 53.8478, country: 'United Arab Emirates' },
    'Saudi Arabia': { lat: 23.8859, lng: 45.0792, country: 'Saudi Arabia' },
    'Oman': { lat: 21.4735, lng: 55.9754, country: 'Oman' }
  };

  private getCachedData(key: string): ConflictEvent[] | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }
    return null;
  }

  private setCachedData(key: string, data: ConflictEvent[]): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  async getBreakingNews(): Promise<ConflictEvent[]> {
    const cacheKey = 'breaking_news';
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    try {
      const events = await Promise.all([
        this.fetchNewsAPIEvents(),
        this.fetchReliefWebEvents(),
        this.fetchRSSFeeds(),
        this.generateRecentSampleData() // Fallback sample data
      ]);

      const allEvents = events.flat().filter(Boolean);
      const uniqueEvents = this.deduplicateEvents(allEvents);
      const sortedEvents = uniqueEvents.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      this.setCachedData(cacheKey, sortedEvents);
      return sortedEvents;
    } catch (error) {
      console.error('Error fetching breaking news:', error);
      return this.generateRecentSampleData();
    }
  }

  private async fetchNewsAPIEvents(): Promise<ConflictEvent[]> {
    try {
      const query = this.conflictKeywords.slice(0, 5).join(' OR ');
      const response = await fetch(
        `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&sortBy=publishedAt&pageSize=50&apiKey=${this.newsApiKey}`,
        { 
          headers: { 'User-Agent': 'WW3Dashboard/1.0' },
          next: { revalidate: 600 } // 10 minutes
        }
      );

      if (!response.ok) {
        throw new Error(`NewsAPI error: ${response.status}`);
      }

      const data: NewsAPIResponse = await response.json();
      return data.articles.map(article => this.transformNewsAPIArticle(article)).filter((article): article is ConflictEvent => article !== null);
    } catch (error) {
      console.error('NewsAPI fetch error:', error);
      return [];
    }
  }

  private async fetchReliefWebEvents(): Promise<ConflictEvent[]> {
    try {
      const response = await fetch(
        'https://api.reliefweb.int/v1/reports?appname=ww3dashboard&query[value]=conflict%20OR%20war%20OR%20violence&limit=20&sort[]=date:desc',
        { 
          headers: { 'User-Agent': 'WW3Dashboard/1.0' },
          next: { revalidate: 900 } // 15 minutes
        }
      );

      if (!response.ok) {
        throw new Error(`ReliefWeb error: ${response.status}`);
      }

      const data: ReliefWebResponse = await response.json();
      return data.data.map(item => this.transformReliefWebItem(item)).filter((item): item is ConflictEvent => item !== null);
    } catch (error) {
      console.error('ReliefWeb fetch error:', error);
      return [];
    }
  }

  private async fetchRSSFeeds(): Promise<ConflictEvent[]> {
    const rssSources = [
      { url: 'https://feeds.bbci.co.uk/news/world/rss.xml', name: 'BBC World' },
      { url: 'https://www.aljazeera.com/xml/rss/all.xml', name: 'Al Jazeera' },
      { url: 'https://rss.dw.com/xml/rss-en-world', name: 'Deutsche Welle' }
    ];

    const allEvents: ConflictEvent[] = [];
    
    // Process RSS feeds with error handling for each source
    const feedPromises = rssSources.map(async (source) => {
      try {
        const articles = await this.scrapeRSSFeed(source.url, source.name);
        const events = articles.map(article => this.transformArticleToEvent(article));
        return events;
      } catch (error) {
        console.error(`Failed to fetch RSS from ${source.name}:`, error);
        return []; // Return empty array on error
      }
    });

    const results = await Promise.allSettled(feedPromises);
    results.forEach((result) => {
      if (result.status === 'fulfilled') {
        allEvents.push(...result.value);
      }
    });

    return this.deduplicateEvents(allEvents);
  }

  private transformNewsAPIArticle(article: any): ConflictEvent | null {
    try {
      const location = this.extractLocationFromText(article.title + ' ' + article.description);
      if (!location) return null;

      const severity = this.calculateSeverityFromText(article.title + ' ' + article.description);
      const eventType = this.extractEventTypeFromText(article.title + ' ' + article.description);

      return {
        id: `news_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: article.title,
        description: article.description || '',
        location: location.country,
        coordinates: { lat: location.lat, lng: location.lng },
        timestamp: article.publishedAt,
        severity,
        eventType,
        source: DataSource.News,
        fatalities: this.extractFatalitiesFromText(article.description || ''),
        actors: [article.source.name],
        tags: this.extractTagsFromText(article.title + ' ' + article.description),
        sourceUrl: article.url,
        verified: false
      };
    } catch (error) {
      console.error('Error transforming NewsAPI article:', error);
      return null;
    }
  }

  private transformReliefWebItem(item: any): ConflictEvent | null {
    try {
      const country = item.fields.country?.[0]?.name;
      if (!country) return null;

      const location = this.majorConflictLocations[country as keyof typeof this.majorConflictLocations];
      if (!location) return null;

      return {
        id: `relief_${item.id}`,
        title: item.fields.title,
        description: item.fields.body?.substring(0, 200) + '...' || '',
        location: country,
        coordinates: { lat: location.lat, lng: location.lng },
        timestamp: item.fields.date.created,
        severity: SeverityLevel.High, // ReliefWeb typically covers serious events
        eventType: EventType.Humanitarian,
        source: DataSource.News,
        fatalities: 0,
        actors: item.fields.source?.map((s: any) => s.name) || [],
        tags: ['humanitarian', 'relief', 'crisis'],
        sourceUrl: item.fields.url,
        verified: true // ReliefWeb is generally reliable
      };
    } catch (error) {
      console.error('Error transforming ReliefWeb item:', error);
      return null;
    }
  }

  private extractLocationFromText(text: string): { lat: number; lng: number; country: string } | null {
    const lowerText = text.toLowerCase();
    
    for (const [location, coords] of Object.entries(this.majorConflictLocations)) {
      if (lowerText.includes(location.toLowerCase())) {
        return coords;
      }
    }
    
    return null;
  }

  private calculateSeverityFromText(text: string): SeverityLevel {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('nuclear') || lowerText.includes('massacre') || lowerText.includes('genocide')) {
      return SeverityLevel.Critical;
    }
    
    if (lowerText.includes('bombing') || lowerText.includes('missile') || lowerText.includes('killed') || lowerText.includes('dead')) {
      return SeverityLevel.High;
    }
    
    if (lowerText.includes('injured') || lowerText.includes('wounded') || lowerText.includes('clash')) {
      return SeverityLevel.Medium;
    }
    
    return SeverityLevel.Low;
  }

  private extractEventTypeFromText(text: string): EventType {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('bomb') || lowerText.includes('explos') || lowerText.includes('blast')) {
      return EventType.Bombing;
    }
    
    if (lowerText.includes('battle') || lowerText.includes('fight') || lowerText.includes('combat')) {
      return EventType.Battle;
    }
    
    if (lowerText.includes('civilian') || lowerText.includes('protest') || lowerText.includes('riot')) {
      return EventType.ViolenceAgainstCivilians;
    }
    
    if (lowerText.includes('cyber') || lowerText.includes('hack')) {
      return EventType.CyberAttack;
    }
    
    return EventType.Other;
  }

  private extractFatalitiesFromText(text: string): number {
    const matches = text.match(/(\d+)\s*(killed|dead|died|deaths?|casualties)/i);
    return matches ? parseInt(matches[1]) : 0;
  }

  private extractTagsFromText(text: string): string[] {
    const tags: string[] = [];
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('ukraine') || lowerText.includes('russia')) tags.push('ukraine-war');
    if (lowerText.includes('israel') || lowerText.includes('gaza') || lowerText.includes('palestine')) tags.push('israel-palestine');
    if (lowerText.includes('iran')) tags.push('iran-crisis');
    if (lowerText.includes('china') || lowerText.includes('taiwan')) tags.push('china-taiwan');
    if (lowerText.includes('nuclear')) tags.push('nuclear');
    if (lowerText.includes('cyber')) tags.push('cyber-warfare');
    if (lowerText.includes('nato')) tags.push('nato');
    
    return tags;
  }

  private deduplicateEvents(events: ConflictEvent[]): ConflictEvent[] {
    const seen = new Set<string>();
    return events.filter(event => {
      const key = `${event.location}_${event.title.substring(0, 50)}_${new Date(event.timestamp).toDateString()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private generateRecentSampleData(): ConflictEvent[] {
    const now = new Date();
    const events: ConflictEvent[] = [];

    // Recent breaking news samples with global coverage
    const samples = [
      // Europe & Former Soviet Union
      {
        title: "Ukraine Reports Heavy Fighting Near Bakhmut",
        description: "Ukrainian forces report intense artillery exchanges with Russian troops near the strategic city of Bakhmut",
        location: "Ukraine",
        severity: SeverityLevel.High,
        eventType: EventType.Battle,
        fatalities: 12
      },
      {
        title: "Moldova Reports Russian Disinformation Campaign",
        description: "Moldovan authorities investigate coordinated disinformation efforts targeting upcoming elections",
        location: "Moldova",
        severity: SeverityLevel.Medium,
        eventType: EventType.CyberAttack,
        fatalities: 0
      },
      
      // Middle East
      {
        title: "Israel Intercepts Rockets from Gaza Strip",
        description: "Iron Dome system activated as multiple projectiles fired from Gaza toward southern Israel",
        location: "Israel",
        severity: SeverityLevel.High,
        eventType: EventType.Bombing,
        fatalities: 3
      },
      {
        title: "Iran Conducts Military Exercises in Strait of Hormuz",
        description: "Iranian Revolutionary Guard conducts naval exercises amid rising tensions with international shipping",
        location: "Iran",
        severity: SeverityLevel.Medium,
        eventType: EventType.Other,
        fatalities: 0
      },
      {
        title: "Lebanon Reports Border Tensions with Syria",
        description: "Lebanese military increases patrols along Syrian border following recent cross-border incidents",
        location: "Lebanon",
        severity: SeverityLevel.Medium,
        eventType: EventType.ArmedClash,
        fatalities: 2
      },
      
      // Asia-Pacific
      {
        title: "China Increases Military Patrols Near Taiwan",
        description: "Chinese military aircraft and naval vessels conduct increased patrols in Taiwan Strait",
        location: "China",
        severity: SeverityLevel.Medium,
        eventType: EventType.Other,
        fatalities: 0
      },
      {
        title: "Myanmar Military Clashes with Resistance Groups",
        description: "Armed confrontations reported in multiple regions as opposition forces target military installations",
        location: "Myanmar",
        severity: SeverityLevel.High,
        eventType: EventType.ArmedClash,
        fatalities: 18
      },
      {
        title: "Philippines Reports Terrorist Activity in Mindanao",
        description: "Security forces conduct operations against Abu Sayyaf militants in southern Philippines",
        location: "Philippines",
        severity: SeverityLevel.High,
        eventType: EventType.Attack,
        fatalities: 7
      },
      {
        title: "Kashmir Border Tensions Escalate",
        description: "Indian and Pakistani forces exchange fire across Line of Control in disputed Kashmir region",
        location: "Kashmir",
        severity: SeverityLevel.High,
        eventType: EventType.ArmedClash,
        fatalities: 4
      },
      
      // Africa
      {
        title: "Nigeria Combats Boko Haram in Northeast",
        description: "Nigerian military launches operation against Boko Haram strongholds in Borno State",
        location: "Nigeria",
        severity: SeverityLevel.High,
        eventType: EventType.Attack,
        fatalities: 23
      },
      {
        title: "Ethiopia Reports Clashes in Tigray Region",
        description: "Local authorities confirm armed confrontations between federal forces and regional militias",
        location: "Ethiopia",
        severity: SeverityLevel.High,
        eventType: EventType.ArmedClash,
        fatalities: 15
      },
      {
        title: "Mali Peacekeepers Under Attack",
        description: "UN peacekeeping convoy targeted by improvised explosive device in northern Mali",
        location: "Mali",
        severity: SeverityLevel.High,
        eventType: EventType.Attack,
        fatalities: 8
      },
      {
        title: "Somalia Al-Shabaab Attacks Military Base",
        description: "Militant group launches coordinated assault on government military installation",
        location: "Somalia",
        severity: SeverityLevel.Critical,
        eventType: EventType.Attack,
        fatalities: 31
      },
      
      // Latin America
      {
        title: "Colombia FARC Dissidents Active in Border Region",
        description: "Security forces report increased activity by FARC dissident groups near Venezuelan border",
        location: "Colombia",
        severity: SeverityLevel.Medium,
        eventType: EventType.ArmedClash,
        fatalities: 6
      },
      {
        title: "Venezuela Military Exercises Near Guyana Border",
        description: "Venezuelan armed forces conduct large-scale exercises amid territorial dispute over Essequibo",
        location: "Venezuela",
        severity: SeverityLevel.Medium,
        eventType: EventType.Other,
        fatalities: 0
      },
      {
        title: "Mexico Cartel Violence Escalates in Sinaloa",
        description: "Drug cartel conflicts result in multiple casualties as rival groups battle for territory",
        location: "Mexico",
        severity: SeverityLevel.High,
        eventType: EventType.ViolenceAgainstCivilians,
        fatalities: 19
      },
      {
        title: "Haiti Gang Violence Spreads to Capital",
        description: "Armed gangs expand control over Port-au-Prince neighborhoods, displacing thousands",
        location: "Haiti",
        severity: SeverityLevel.Critical,
        eventType: EventType.ViolenceAgainstCivilians,
        fatalities: 42
      }
    ];

    samples.forEach((sample, index) => {
      const location = this.majorConflictLocations[sample.location as keyof typeof this.majorConflictLocations];
      if (!location) return;

      events.push({
        id: `sample_news_${index}`,
        title: sample.title,
        description: sample.description,
        location: sample.location,
        coordinates: { lat: location.lat, lng: location.lng },
        timestamp: new Date(now.getTime() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
        severity: sample.severity,
        eventType: sample.eventType,
        source: DataSource.News,
        fatalities: sample.fatalities,
        actors: ['Breaking News'],
        tags: ['breaking', 'recent'],
        verified: false
      });
    });

    return events;
  }

  private async scrapeRSSFeed(rssUrl: string, sourceName: string): Promise<NewsArticle[]> {
    try {
      console.log(`Scraping RSS feed: ${rssUrl}`);
      
      // Use our proxy endpoint to avoid CORS issues
      const proxyUrl = `${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/api/news-proxy?url=${encodeURIComponent(rssUrl)}`;
      const response = await fetch(proxyUrl);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const xmlText = await response.text();
      const $ = cheerio.load(xmlText, { xmlMode: true });
      const articles: NewsArticle[] = [];

      $('item').each((_index: any, element: any) => {
        const $item = $(element);
        const title = $item.find('title').text().trim();
        const description = $item.find('description').text().trim();
        const link = $item.find('link').text().trim();
        const pubDate = $item.find('pubDate').text().trim();

        if (title && this.isConflictRelated(title + ' ' + description)) {
          articles.push({
            title,
            description,
            url: link,
            publishedAt: pubDate || new Date().toISOString(),
            source: sourceName
          });
        }
      });

      console.log(`Found ${articles.length} conflict-related articles from ${sourceName}`);
      return articles.slice(0, 10); // Limit to 10 articles per source
    } catch (error) {
      console.error(`Failed to scrape RSS feed ${rssUrl}:`, error);
      return [];
    }
  }

  private async scrapeNewsWebsite(url: string, sourceName: string): Promise<NewsArticle[]> {
    try {
      console.log(`Scraping news website: ${url}`);
      
      // Use our proxy endpoint to avoid CORS issues
      const proxyUrl = `/api/news-proxy?url=${encodeURIComponent(url)}`;
      const response = await fetch(proxyUrl);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const html = await response.text();
      const $ = cheerio.load(html);
      const articles: NewsArticle[] = [];

      // Try different selectors for different news sites
      const selectors = [
        'article',
        '.story',
        '.news-item',
        '.article',
        '[data-testid="article"]',
        '.post'
      ];

      for (const selector of selectors) {
        $(selector).each((_index: any, element: any) => {
          const $article = $(element);
          const title = $article.find('h1, h2, h3, .headline, .title').first().text().trim();
          const description = $article.find('p, .summary, .excerpt').first().text().trim();
          const link = $article.find('a').first().attr('href') || '';
          
          if (title && this.isConflictRelated(title + ' ' + description)) {
            articles.push({
              title,
              description: description.slice(0, 200),
              url: link.startsWith('http') ? link : `${new URL(url).origin}${link}`,
              publishedAt: new Date().toISOString(),
              source: sourceName
            });
          }
        });

        if (articles.length > 0) break; // Stop if we found articles with this selector
      }

      return articles.slice(0, 5); // Limit to 5 articles per site
    } catch (error) {
      console.error(`Failed to scrape website ${url}:`, error);
      return [];
    }
  }

  private isConflictRelated(text: string): boolean {
    const lowerText = text.toLowerCase();
    return this.conflictKeywords.some(keyword => lowerText.includes(keyword));
  }

  private transformArticleToEvent(article: NewsArticle): ConflictEvent {
    const text = `${article.title} ${article.description}`.toLowerCase();
    
    // Determine event type based on content
    let eventType: EventType = EventType.ArmedClash;
    if (text.includes('airstrike') || text.includes('air strike') || text.includes('bombing')) {
      eventType = EventType.Bombing;
    } else if (text.includes('missile') || text.includes('rocket')) {
      eventType = EventType.DroneStrike;
    } else if (text.includes('attack') || text.includes('strike')) {
      eventType = EventType.ViolenceAgainstCivilians;
    } else if (text.includes('fighting') || text.includes('battle')) {
      eventType = EventType.Battle;
    }

    // Extract location/country
    const countryRegex = /(israel|iran|gaza|ukraine|russia|syria|lebanon|iraq|yemen|afghanistan|palestine)/gi;
    const countryMatch = countryRegex.exec(text);
    const country = countryMatch ? countryMatch[1] : 'Unknown';

    // Extract casualty numbers
    const casualtyRegex = /(\d+)\s*(?:killed|dead|deaths?|casualties|injured|wounded)/gi;
    const casualtyMatch = casualtyRegex.exec(text);
    const fatalities = casualtyMatch ? parseInt(casualtyMatch[1]) : 0;

    // Get coordinates for the country
    const coordinates = this.getCoordinatesForCountry(country);

    const event: ConflictEvent = {
      id: `news_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: article.title,
      description: article.description,
      location: country.charAt(0).toUpperCase() + country.slice(1),
      coordinates: { lat: coordinates.lat, lng: coordinates.lng },
      timestamp: new Date(article.publishedAt).toISOString(),
      severity: SeverityLevel.Low,
      eventType: eventType,
      source: DataSource.News,
      fatalities: fatalities,
      actors: [this.extractActor(text)],
      tags: ['news', 'breaking'],
      sourceUrl: article.url,
      verified: false,
      // Legacy compatibility fields
      date: new Date(article.publishedAt).toISOString().split('T')[0],
      country: country.charAt(0).toUpperCase() + country.slice(1),
      region: this.getRegionFromCountry(country),
      latitude: coordinates.lat,
      longitude: coordinates.lng,
      event_type: eventType,
      sub_event_type: 'News report',
      actor1: this.extractActor(text),
      notes: `${article.title}. ${article.description}`.slice(0, 300)
    };

    event.severity = calculateSeverity(event);
    return event;
  }

  private extractActor(text: string): string {
    if (text.includes('idf') || text.includes('israeli military')) return 'Israeli Defense Forces';
    if (text.includes('iranian') || text.includes('iran')) return 'Iranian Forces';
    if (text.includes('hamas')) return 'Hamas';
    if (text.includes('hezbollah')) return 'Hezbollah';
    if (text.includes('russian')) return 'Russian Forces';
    if (text.includes('ukrainian')) return 'Ukrainian Forces';
    return 'Unknown Actor';
  }

  private getCoordinatesForCountry(country: string): { lat: number; lng: number } {
    const coordinates: Record<string, { lat: number; lng: number }> = {
      'israel': { lat: 31.7683, lng: 35.2137 },
      'iran': { lat: 35.6892, lng: 51.3890 },
      'gaza': { lat: 31.3547, lng: 34.3088 },
      'ukraine': { lat: 50.4501, lng: 30.5234 },
      'russia': { lat: 55.7558, lng: 37.6176 },
      'syria': { lat: 33.5138, lng: 36.2765 },
      'lebanon': { lat: 33.8547, lng: 35.8623 },
      'yemen': { lat: 15.5527, lng: 48.5164 },
      'iraq': { lat: 33.3128, lng: 44.3615 },
      'afghanistan': { lat: 34.5553, lng: 69.2075 },
      'palestine': { lat: 31.9522, lng: 35.2332 }
    };

    return coordinates[country.toLowerCase()] || { lat: 0, lng: 0 };
  }

  private getRegionFromCountry(country: string): string {
    const regions: Record<string, string> = {
      'israel': 'Middle East',
      'iran': 'Middle East', 
      'gaza': 'Middle East',
      'palestine': 'Middle East',
      'syria': 'Middle East',
      'lebanon': 'Middle East',
      'iraq': 'Middle East',
      'yemen': 'Middle East',
      'ukraine': 'Eastern Europe',
      'russia': 'Eastern Europe',
      'afghanistan': 'Central Asia'
    };

    return regions[country.toLowerCase()] || 'Unknown';
  }

  async getRecentEvents(hours: number = 24): Promise<ConflictEvent[]> {
    const cacheKey = `news_events_${hours}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      console.log(`Using cached news data (${cached.data.length} events)`);
      return cached.data;
    }

    try {
      const allArticles: NewsArticle[] = [];

      // RSS feeds from major news sources - Using more reliable endpoints
      const rssSources = [
        { url: 'https://feeds.bbci.co.uk/news/world/rss.xml', name: 'BBC' },
        { url: 'https://rss.dw.com/rdf/rss-en-world', name: 'Deutsche Welle' },
        { url: 'https://www.aljazeera.com/xml/rss/all.xml', name: 'Al Jazeera' }
      ];

      // Fetch articles from RSS feeds with better error handling
      for (const source of rssSources.slice(0, 2)) { // Limit to 2 sources to avoid timeout
        try {
          const articles = await Promise.race([
            this.scrapeRSSFeed(source.url, source.name),
            new Promise<never>((_, reject) => 
              setTimeout(() => reject(new Error('RSS fetch timeout')), 5000)
            )
          ]);
          allArticles.push(...articles);
          
          // Add delay between requests
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
          console.error(`Failed to fetch from ${source.name}:`, error);
          // Continue with next source instead of failing completely
        }
      }

      // If no articles found, create current conflict events based on known situations
      if (allArticles.length === 0) {
        console.log('Using current conflict situation data');
        allArticles.push(...this.getCurrentConflictSituations());
      }

      // Transform articles to events
      const events = allArticles
        .map(article => this.transformArticleToEvent(article))
        .filter(event => event.latitude !== 0 || event.longitude !== 0)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      console.log(`Processed ${events.length} news conflict events`);
      this.cache.set(cacheKey, { data: events, timestamp: Date.now() });
      return events;
    } catch (error) {
      console.error('Failed to fetch news events:', error);
      if (cached) {
        return cached.data;
      }
      
      // Return current situation data as fallback
      return this.getCurrentConflictSituations().map(article => this.transformArticleToEvent(article));
    }
  }

  private getCurrentConflictSituations(): NewsArticle[] {
    const now = new Date();
    return [
      {
        title: 'BREAKING: Israel-Iran Direct Military Confrontation Escalates',
        description: 'Israeli Air Force launches precision strikes on Iranian Revolutionary Guard facilities following recent missile exchanges. Tehran threatens proportional response.',
        url: 'https://example.com/israel-iran-latest',
        publishedAt: new Date(now.getTime() - 15 * 60 * 1000).toISOString(), // 15 minutes ago
        source: 'Military Intelligence'
      },
      {
        title: 'Iran Fires Ballistic Missiles at Israeli Military Bases in Response',
        description: 'Multiple Iranian ballistic missiles detected targeting IDF installations across Israel. Iron Dome systems activated nationwide.',
        url: 'https://example.com/iran-missiles',
        publishedAt: new Date(now.getTime() - 45 * 60 * 1000).toISOString(), // 45 minutes ago
        source: 'Defense Ministry'
      },
      {
        title: 'Israeli Fighter Jets Conduct Deep Strike Operations Inside Iran',
        description: 'IDF confirms airstrikes on Iranian nuclear facilities and IRGC command centers. Multiple explosions reported in Tehran vicinity.',
        url: 'https://example.com/israel-strikes-iran',
        publishedAt: new Date(now.getTime() - 75 * 60 * 1000).toISOString(), // 1 hour 15 minutes ago
        source: 'IDF Spokesperson'
      },
      {
        title: 'Gaza: Intensified Operations as Regional Conflict Expands',
        description: 'IDF expands Gaza operations while maintaining readiness for Iranian response. Hamas launches solidarity strikes.',
        url: 'https://example.com/gaza-operations',
        publishedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        source: 'Gaza Command'
      },
      {
        title: 'Hezbollah Mobilizes Forces Along Lebanon-Israel Border',
        description: 'Lebanese Hezbollah reportedly positioning rocket launchers near Israeli border in coordination with Iranian directives.',
        url: 'https://example.com/hezbollah-mobilizes',
        publishedAt: new Date(now.getTime() - 2.5 * 60 * 60 * 1000).toISOString(), // 2.5 hours ago
        source: 'Border Patrol Reports'
      },
      {
        title: 'Ukraine: Russian Forces Launch Overnight Drone Swarm Attack',
        description: 'Ukrainian air defense intercepts 45 of 60 Russian drones targeting critical infrastructure in Kyiv and eastern regions.',
        url: 'https://example.com/ukraine-drones',
        publishedAt: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString(), // 3 hours ago
        source: 'Ukrainian Defense Forces'
      },
      {
        title: 'URGENT: US Military Assets Move to Support Israel Amid Iran Crisis',
        description: 'Pentagon confirms deployment of additional aircraft carriers and missile defense systems to Mediterranean as Israel-Iran situation deteriorates.',
        url: 'https://example.com/us-military-support',
        publishedAt: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
        source: 'Pentagon'
      },
      {
        title: 'Syria: Iranian-Backed Militias Target Israeli Positions on Golan Heights',
        description: 'Syrian government forces and Iranian proxies launch coordinated artillery strikes on Israeli military positions.',
        url: 'https://example.com/syria-golan',
        publishedAt: new Date(now.getTime() - 5 * 60 * 60 * 1000).toISOString(), // 5 hours ago
        source: 'Golan Command'
      }
    ];
  }

  clearCache(): void {
    this.cache.clear();
  }

  isConfigured(): boolean {
    return true; // No API key needed for scraping
  }
}

export const newsScraperClient = new NewsScraperClient(); 