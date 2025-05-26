import { useEffect, useState } from 'react';

type ExternalStats = {
  stars?: number;
  downloads?: number;
};

export const useExternalStats = () => {
  const [stats, setStats] = useState<ExternalStats>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [gh, npm] = await Promise.all([
          fetch('https://api.github.com/repos/DFranck/ez-start'),
          fetch('https://api.npmjs.org/downloads/point/last-month/@ezstart/ui'),
        ]);

        const ghData = await gh.json();
        const npmData = await npm.json();

        setStats({
          stars: ghData.stargazers_count,
          downloads: npmData.downloads,
        });
      } catch (e) {
        console.error('Error fetching external stats:', e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  return { stats, isLoading };
};
