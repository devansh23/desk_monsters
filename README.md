# Desk Monsters

A virtual pet desktop application built with Electron. Take care of your cute desk monster by feeding, playing, and interacting with it!

## Features

- Animated pet sprite with various emotions and actions
- Pet metrics (Hunger, Happiness, Energy, Health, Love)
- Interactive actions (Feed, Play, Clean, Sleep, Teach, MYOB)
- Real-time metric decay system
- Beautiful and modern UI

## Installation

1. Clone the repository:
```bash
git clone https://github.com/devansh23/desk_monsters.git
cd desk_monsters
```

2. Install dependencies:
```bash
npm install
```

3. Start the application:
```bash
npm start
```

## Development

This project uses:
- Electron for the desktop application framework
- HTML5 Canvas for sprite animations
- Node.js for backend logic

### Project Structure

```
desk_monsters/
├── assets/
│   ├── sprites/     # Pet sprite sheets
│   └── sounds/      # Game sound effects
├── src/
│   ├── logic/       # Game logic
│   ├── index.html   # Main window
│   ├── main.js      # Main process
│   ├── renderer.js  # Renderer process
│   └── preload.js   # Preload script
└── package.json
```

## License

MIT 