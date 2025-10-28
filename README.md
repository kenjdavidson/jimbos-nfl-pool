# Jimbo's NFL Pools

Manages/tracks weekly spread pool results.

## Setup

1. Clone the repository

```
$> git clone git@github.com:kenjdavidson/jimbos-nfl-pool.git
```

2. Install project

```
$> npm ci
```

3. Start the development server

```
$> npm run dev
```

> The development process kicks off the required components tailwindcss and eleventy.

## Data Organization

Pool data is organized by year in the `data/{year}/` directory structure:

```
data/
└── 2024/
    ├── NFL 2024 week 1.xlsx
    ├── NFL 2024 week 4.xlsx
    ├── NFL 2024 week 5.xlsx
    └── NFL 2024 week 6.xlsx
```

### Adding New Data

To add data for a new week or year:

1. Create the appropriate year directory if it doesn't exist: `data/{year}/`
2. Add your Excel files following the naming convention: `NFL {YEAR} week {WEEK}.xlsx`
3. The site will automatically detect and process all Excel files in year directories

### URL Structure

- Homepage: `/`
- Week pages: `/week/{year}/{week}/`
- Player profiles: `/players/{player-id}/`

The site includes year and week selection dropdowns that allow easy navigation between different years and weeks.