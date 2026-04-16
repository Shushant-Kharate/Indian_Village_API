# Village API Demo - Contact Form Application

A beautiful, production-ready demo application showcasing the Village API autocomplete integration. Perfect for presentations and B2B client demonstrations.

## 🎯 Features

- **Beautiful Contact Form** - Clean, modern design with Tailwind CSS
- **Live Village Autocomplete** - Search from 455,000+ Indian villages
- **Auto-filling Address Fields** - Automatically populate sub-district, district, state
- **Standardized Format** - Display full address in standardized format: Village, Sub-District, District, State, India
- **Responsive Design** - Works perfectly on desktop, tablet, and mobile
- **Real API Integration** - Connects to live Village API backend
- **Zero Authentication** - Uses public demo API key for easy presentations

## 🚀 Quick Start

### Install Dependencies
```bash
npm install
```

### Run Development Server
```bash
npm run dev
```

Server will start at `http://localhost:5174`

### Build for Production
```bash
npm run build
npm run preview
```

## 📦 Tech Stack

- **React 18** - UI framework
- **Vite** - Lightning-fast build tool
- **Tailwind CSS** - Utility-first styling
- **Axios** - HTTP client
- **Village API** - Address data backend

## 🔧 Configuration

Edit `.env.local` to change API settings:

```env
VITE_API_URL=http://localhost:3000/api/v1
VITE_API_KEY=demo_public_key_for_presentations
```

## 📋 How It Works

1. **User Types in Village Field** (minimum 2 characters)
   - Frontend calls `/api/v1/search?q={query}`
   - API returns matching villages with full hierarchy

2. **Select a Village**
   - Dropdown shows: "Manibeli (Akkalkuwa, Nandurbar, Maharashtra)"
   - Click to select

3. **Auto-populate Address**
   - Sub-District, District, and State fields automatically fill
   - Country defaults to "India"
   - Full address displayed below

4. **Submit Form**
   - Complete contact information ready to send
   - Includes standardized address format

## 📊 Form Fields

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Full Name | text | Yes | User's name |
| Email | email | Yes | Valid email address |
| Phone | tel | Yes | Phone number with country code |
| Village/Area | autocomplete | Yes | Searches via Village API |
| Sub-District | text | No | Auto-filled |
| District | text | No | Auto-filled |
| State | text | No | Auto-filled |
| Country | text | No | Always "India" |
| Message | textarea | Yes | User inquiry |

## 🎨 Design Features

- **Gradient Background** - Modern blue gradient
- **Shadow Effects** - Clean depth and hierarchy
- **Smooth Animations** - Loading spinners and transitions
- **Responsive Grid** - Auto-adjusts on mobile
- **Success Screen** - Beautiful confirmation after submission
- **Accessibility** - Proper labels and ARIA attributes

## 🔐 Demo Configuration

This demo uses a **restricted public API key** with:
- ✓ Read-only access
- ✓ 100 requests per day limit
- ✓ All India state data
- ✓ Publicly shareable for presentations

## 🚢 Deployment

### Deploy to Vercel (Recommended)

```bash
npm install -g vercel
vercel
```

Configure environment variables in Vercel dashboard.

### Deploy to Static Hosting

```bash
npm run build
# Upload `dist/` folder to your hosting
```

## 📝 Example API Calls

### Search Villages
```bash
curl "http://localhost:3000/api/v1/search?q=village&hierarchyLevel=village" \
  -H "Authorization: Bearer demo_key" \
  -H "X-API-Key: demo_key"
```

## 💡 Tips for Presentations

1. **Pre-load in Browser** - Open demo before presentation starts
2. **Use Test Data** - Prepare common village names to demonstrate
3. **Show Real Response** - Open browser dev tools to show API calls
4. **Highlight Features** - Point out auto-filling, autocomplete, and standardized format

## 📞 Support

For issues with the Village API itself, check the main project documentation.

For demo-specific issues, refer to the [main project README](../README.md).

## 📄 License

Same as main Village API project

---

**Ready to showcase the Village API!** 🎉

Deploy this demo for potential B2B clients to see the power of standardized address data.
