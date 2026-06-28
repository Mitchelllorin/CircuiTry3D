
import express from 'express';
import fetch from 'node-fetch';
import { REPOS } from '../constants.js';

export const handlePreviewRoute = async (req, res) => {
  try {
    const results = [];

    for (const repo of REPOS) {
      const url = `https://api.github.com/repos/${repo}/pulls`;
      const response = await fetch(url);
      const prs = await response.json();

      results.push({
        repo,
        prs: Array.isArray(prs) ? prs : []
      });
    }

    res.json({ repos: results });
  } catch (err) {
    console.error("Error fetching PRs:", err);
    res.status(500).json({ error: "Failed to load PRs" });
  }
};

const router = express.Router();
router.get('/', handlePreviewRoute);

export default router;
