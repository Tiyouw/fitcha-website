# Fitcha Website

R&D Formulation Nexus is a single-page CSV analysis dashboard for a high-protein, plant-based milk tea concept. Upload Google Form responses (CSV) to compare tea directions and generate a first-pass formulation range for a 20 g protein RTD milk tea.

## Features

- CSV upload and drag-and-drop support
- Example data loader and exportable analysis CSV
- Mobile-friendly layout with readable cards and tables
- Compatibility scoring across four tea directions: Oolong, Jasmine, Hojicha, Thai Tea
- Summary outputs: market gap signals, dominant decision signals, masking fit, AI reasoning
- Recommended formulation range with ingredient levers and process flow

## How it works

- Reads Google Form CSV rows and maps answers to flavor/texture signals
- Scores each tea direction on sensory-word fit, masking fit, market gap fit, and formulation fit
- Ranks directions, surfaces risks (beany, chalky, bitter, sweet), and suggests formulation ranges

## Local preview

Open `index.html` directly in a browser, or use a simple static server.

## Deploy to Vercel

1. Push this repo to GitHub.
2. In Vercel, click "Add New" -> "Project".
3. Import the repo and keep the framework as "Other" (static).
4. Build command: leave empty.
5. Output directory: leave empty.
6. Deploy.

## Notes

- The app runs entirely in the browser. No backend required.
- CSV must be exported from Google Forms (CSV format).
- Output is an AI-assisted estimate, not a validated sensory result.
- This project is from Gari/Arinal Haq Team, @Tiyouw only helping with the improve & deployments.
