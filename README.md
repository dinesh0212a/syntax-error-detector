# Syntax Error Detector - Frontend

A powerful **Context-Free Grammar analyzer** with real-time LR parsing visualization. Analyze grammars, detect syntax errors, and explore parser automata interactively.

## ✨ Features

- **Multiple LR Parser Variants**: SLR(1), LALR(1), and CLR(1)
- **Real-time Grammar Analysis**: Instant FIRST/FOLLOW set computation
- **Interactive Parse Trace**: Step-by-step visualization of shift-reduce operations
- **Grammar Quality Checks**: Detect left recursion and left-factoring issues
- **Syntax Error Diagnostics**: Smart crash diagnostics with expected token suggestions
- **Parsing Table Visualization**: Color-coded ACTION/GOTO tables
- **100% Client-Side**: All computation runs in your browser (no backend needed!)

## 🚀 Quick Start

### Local Development

```bash
# Install dependencies
npm install

# Start development server
npm start
```

The app will open at [http://localhost:3000](http://localhost:3000).

### Build for Production

```bash
# Create optimized production build
npm run build
```

## 📦 Deployment

### GitHub Pages

1. **Fork or Clone** this repository
2. **Update `homepage` in `package.json`** to match your GitHub Pages URL:
   ```json
   "homepage": "https://your-username.github.io/syntax-error-detector"
   ```
3. **Push to GitHub** and enable GitHub Actions in repository settings
4. The app will automatically deploy to GitHub Pages on each push to `main`

### Vercel (Recommended)

Vercel offers **free, instant deployments** with automatic previews:

1. Go to [vercel.com](https://vercel.com)
2. Click **"New Project"**
3. Import this repository
4. Click **"Deploy"** (no configuration needed!)
5. Your app will be live at a Vercel URL

### Netlify

1. Connect your GitHub repository at [netlify.com](https://netlify.com)
2. Build command: `npm run build`
3. Publish directory: `build`
4. Deploy!

## 📖 Usage Guide

### Input Format

**Grammar Syntax:**
```
E -> E + T | T
T -> T * F | F
F -> ( E ) | id
```

- Use `->`, `→`, or `::=` for productions
- Separate alternatives with `|`
- Use `ε`, `epsilon`, or `#` for epsilon productions
- Symbols are whitespace-delimited

**Source Input:**
```
id + id * id
```

### Understanding the Output

- **Parse Trace**: Step-by-step execution of the parser
- **FIRST/FOLLOW Sets**: Computed grammar-wide sets
- **Parsing Table**: The complete ACTION/GOTO table
- **Grammar Checks**: Left recursion and left-factoring issues

## 🛠️ Technology Stack

- **React 18** - UI framework
- **React Scripts 5** - Build tooling (Create React App)
- **Pure JavaScript** - Algorithm implementations (no external parser libraries)

## 📝 Grammar Theory

### SLR(1)
Simple LR parser using FOLLOW sets. Fastest but most restrictive.

### LALR(1)
Lookahead LR parser merging CLR states. Best balance for most grammars.

### CLR(1)
Canonical LR parser with full lookahead. Most powerful but largest table.

## 🐛 Troubleshooting

### App shows "Build failed"
- Check that `npm install` completed successfully
- Delete `node_modules` and `.package-lock.json`, then run `npm install` again

### Grammar not parsing
- Verify all symbols use whitespace separation
- Check that all non-terminals on RHS have productions
- Avoid spaces in symbol names (e.g., use `id` not `id name`)

### Deployment issues
- For GitHub Pages: Ensure `homepage` in `package.json` matches your repo URL
- For Vercel/Netlify: Check build logs in the deployment dashboard

## 📄 License

MIT

## 🤝 Contributing

Contributions welcome! Feel free to:
- Report bugs
- Suggest features
- Submit pull requests

---

**Made with ♥️ for CS students and compiler enthusiasts**
