/**
 * Frontend API Helper for Player Card Enrichment
 * 
 * Add this to your React FRONTEND project: src/utils/enrichment.js
 */

import { getApiUrl } from './api'

/**
 * Enrich a player card with Warcraft Logs data
 * 
 * @param {string} warcraftLogsUrl - Valid Warcraft Logs character URL
 * @param {string} seasonKey - Optional season key (default: "latest")
 * @returns {Promise<Object>} Enriched player card data
 */
export async function enrichPlayerCard(warcraftLogsUrl, seasonKey = 'latest') {
  const response = await fetch(`${getApiUrl()}/api/enrich-player-card`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      warcraftLogsUrl,
      seasonKey,
    }),
  })

  const result = await response.json()

  if (!result.success) {
    throw new Error(result.message || 'Failed to enrich player card')
  }

  return result.data
}

/**
 * Example usage in React component
 */
export function ExampleUsage() {
  const [playerCard, setPlayerCard] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleEnrich = async (url) => {
    setLoading(true)
    setError(null)

    try {
      const data = await enrichPlayerCard(url)
      setPlayerCard(data)

      // Check status
      if (data.fetchStatus === 'complete') {
        console.log('✅ Successfully enriched:', data)
      } else if (data.fetchStatus === 'partial') {
        console.warn('⚠️ Partial data:', data.errorMessage)
      } else if (data.fetchStatus === 'failed') {
        console.error('❌ Failed:', data.errorMessage)
      }
    } catch (err) {
      setError(err.message)
      console.error('Enrichment error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {loading && <p>Enriching player card...</p>}
      {error && <p className="text-red-500">Error: {error}</p>}
      
      {playerCard && (
        <div className="player-card">
          <h3>{playerCard.characterName}</h3>
          <p>Realm: {playerCard.realm}</p>
          <p>Region: {playerCard.region}</p>
          
          {playerCard.classSpec && (
            <p>Class/Spec: {playerCard.classSpec}</p>
          )}
          
          {playerCard.bestKillLatestSeason && (
            <div>
              <h4>Best Kill</h4>
              <p>Boss: {playerCard.bestKillLatestSeason.encounterName}</p>
              <p>Difficulty: {playerCard.bestKillLatestSeason.difficulty}</p>
              <p>Parse: {playerCard.bestKillLatestSeason.rankPercent}%</p>
            </div>
          )}
          
          {playerCard.errorMessage && (
            <p className="text-yellow-500">⚠️ {playerCard.errorMessage}</p>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Integration with Application Form
 * 
 * Example: Enrich player card when user submits Warcraft Logs URL
 */
export async function handleApplicationSubmit(formData) {
  const { warcraftLogsUrl, ...otherData } = formData

  let enrichedData = null

  if (warcraftLogsUrl) {
    try {
      enrichedData = await enrichPlayerCard(warcraftLogsUrl)
    } catch (error) {
      console.warn('Failed to enrich, continuing with manual data:', error)
    }
  }

  // Submit application with enriched data if available
  const submissionData = {
    ...otherData,
    
    // Use enriched data if available, otherwise use manual input
    characterName: enrichedData?.characterName || formData.characterName,
    realm: enrichedData?.realm || formData.realm,
    region: enrichedData?.region || formData.region,
    
    // Additional enriched fields
    mostPlayedSpec: enrichedData?.mostPlayedSpec,
    bestKill: enrichedData?.bestKillLatestSeason,
    classSpec: enrichedData?.classSpec,
    
    // Metadata
    enrichmentStatus: enrichedData?.fetchStatus || 'not_attempted',
    enrichedAt: enrichedData?.updatedAt,
  }

  return submissionData
}
