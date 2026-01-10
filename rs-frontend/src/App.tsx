import { useState, useEffect } from 'react'
import { Routes, Route, Link, useLocation } from 'react-router-dom'
import { Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import './App.css'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
)

type Answer = 'yes' | 'no' | null
type Organization = 'relief-society' | 'elders-quorum' | 'young-mens' | 'young-womens' | null

interface Story {
  datetime_submitted: string
  content: string
}

interface SurveyResult {
  organization: Organization
  q_did_you_set_a_cfm_goal: Answer
  q_did_you_make_progress_this_week: Answer
}

interface SurveyReport {
  total_responses: number
  organization_breakdown: Record<string, number>
  question_stats: Record<string, Record<string, number>>
  question_stats_by_org: Record<string, Record<string, Record<string, number>>>
}

/**
 * Maps frontend organization values (with hyphens) to backend enum format (with spaces).
 */
function mapOrganizationToBackend(org: Organization): string {
  if (org === null) {
    throw new Error('Organization cannot be null')
  }
  const mapping: Record<Exclude<Organization, null>, string> = {
    'relief-society': 'relief society',
    'elders-quorum': 'elders quorum',
    'young-mens': 'young mens',
    'young-womens': 'young womens',
  }
  return mapping[org]
}

/**
 * Maps backend organization values (with spaces) to frontend format (with hyphens).
 */
function mapOrganizationFromBackend(org: string): Organization {
  const mapping: Record<string, Organization> = {
    'relief society': 'relief-society',
    'elders quorum': 'elders-quorum',
    'young mens': 'young-mens',
    'young womens': 'young-womens',
  }
  return mapping[org] || null
}

/**
 * Wraps text into multiple lines with a maximum character limit per line.
 * Tries to break at word boundaries when possible.
 */
function wrapText(text: string, maxCharsPerLine: number = 50): string {
  if (text.length <= maxCharsPerLine) {
    return text
  }

  const words = text.split(' ')
  const lines: string[] = []
  let currentLine = ''

  for (const word of words) {
    if (currentLine === '') {
      currentLine = word
    } else if ((currentLine + ' ' + word).length <= maxCharsPerLine) {
      currentLine += ' ' + word
    } else {
      lines.push(currentLine)
      currentLine = word
    }
  }

  if (currentLine) {
    lines.push(currentLine)
  }

  return lines.join('\n')
}

function App() {
  const location = useLocation()
  const [organization, setOrganization] = useState<Organization>(null)
  const [q_did_you_set_a_cfm_goal, setQDidYouSetACfmGoal] = useState<Answer>(null)
  const [q_did_you_make_progress_this_week, setQDidYouMakeProgressThisWeek] = useState<Answer>(null)
  const [stories, setStories] = useState<Story[]>([])
  const [storyText, setStoryText] = useState<string>('')
  const [surveyResults, setSurveyResults] = useState<SurveyResult[]>([])
  const [surveyReport, setSurveyReport] = useState<SurveyReport | null>(null)
  const [isLoadingReports, setIsLoadingReports] = useState<boolean>(false)
  const [reportsError, setReportsError] = useState<string | null>(null)
  const [isLoadingStories, setIsLoadingStories] = useState<boolean>(false)
  const [storiesError, setStoriesError] = useState<string | null>(null)
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false)
  const [pendingStoryText, setPendingStoryText] = useState<string>('')

  // Determine active tab from location
  const activeTab = location.pathname === '/reports' ? 'reports' 
    : location.pathname === '/stories' ? 'stories' 
    : 'submit-goals'

  // Fetch survey reports from backend
  useEffect(() => {
    const fetchReports = async () => {
      setIsLoadingReports(true)
      setReportsError(null)
      try {
        const response = await fetch('/survey/reports')
        if (!response.ok) {
          throw new Error(`Failed to fetch reports: ${response.statusText}`)
        }
        const data: SurveyReport = await response.json()
        setSurveyReport(data)
      } catch (error) {
        console.error('Error fetching reports:', error)
        setReportsError(error instanceof Error ? error.message : 'Failed to fetch reports')
      } finally {
        setIsLoadingReports(false)
      }
    }

    // Fetch when reports tab is active or on mount
    if (activeTab === 'reports') {
      fetchReports()
    }
  }, [activeTab])

  // Fetch stories from backend
  useEffect(() => {
    const fetchStories = async () => {
      setIsLoadingStories(true)
      setStoriesError(null)
      try {
        const response = await fetch('/stories/')
        if (!response.ok) {
          throw new Error(`Failed to fetch stories: ${response.statusText}`)
        }
        const data: Story[] = await response.json()
        setStories(data)
      } catch (error) {
        console.error('Error fetching stories:', error)
        setStoriesError(error instanceof Error ? error.message : 'Failed to fetch stories')
      } finally {
        setIsLoadingStories(false)
      }
    }

    // Fetch when stories tab is active or on mount
    if (activeTab === 'stories') {
      fetchStories()
    }
  }, [activeTab])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('handleSubmit called')
    
    const allAnswered = organization !== null && q_did_you_set_a_cfm_goal !== null && q_did_you_make_progress_this_week !== null
    
    if (!allAnswered) {
      alert('Please answer all questions before submitting.')
      return
    }

    const results: SurveyResult = {
      organization,
      q_did_you_set_a_cfm_goal,
      q_did_you_make_progress_this_week
    }
    
    // Update local state for immediate UI feedback
    setSurveyResults(prev => [...prev, results])
    
    // Submit to backend
    const requestBody = {
      organization: mapOrganizationToBackend(organization),
      q_did_you_set_a_cfm_goal: q_did_you_set_a_cfm_goal,
      q_did_you_make_progress_this_week: q_did_you_make_progress_this_week,
    }
    
    console.log('Making fetch request to /survey/ with body:', requestBody)
    
    try {
      const response = await fetch('/survey/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      console.log('Fetch response received:', response.status, response.statusText)

      if (!response.ok) {
        throw new Error(`Failed to submit survey: ${response.statusText}`)
      }

      const data = await response.json()
      console.log('Survey submitted successfully:', data)
      alert('Thank you for completing the survey!')
      
      // Refresh reports if we're on the reports tab
      if (activeTab === 'reports') {
        const reportsResponse = await fetch('/survey/reports')
        if (reportsResponse.ok) {
          const reportsData: SurveyReport = await reportsResponse.json()
          setSurveyReport(reportsData)
        }
      }
    } catch (error) {
      console.error('Error submitting survey:', error)
      alert('Failed to submit survey. Please try again.')
    }
    
    // Reset form
    setOrganization(null)
    setQDidYouSetACfmGoal(null)
    setQDidYouMakeProgressThisWeek(null)
  }

  const renderSubmitGoals = () => (
    <div className="frosted-glass-card">
      <h1 className="survey-title">Come Follow Me Tracker</h1>
      <form onSubmit={handleSubmit}>
      <div className="question-group">
          <label className="question-label">
            Which are you?
          </label>
          <div className="icon-group">
            <button
              type="button"
              className={`icon-button ${organization === 'relief-society' ? 'selected' : ''}`}
              onClick={() => setOrganization('relief-society')}
              aria-label="Relief Society"
            >
              <i className="fa-solid fa-person-dress"></i>
              <span>Relief Society</span>
            </button>
            <button
              type="button"
              className={`icon-button ${organization === 'elders-quorum' ? 'selected' : ''}`}
              onClick={() => setOrganization('elders-quorum')}
              aria-label="Elders Quorum"
            >
              <i className="fa-solid fa-user-tie"></i>
              <span>Elders Quorum</span>
            </button>
            <button
              type="button"
              className={`icon-button ${organization === 'young-mens' ? 'selected' : ''}`}
              onClick={() => setOrganization('young-mens')}
              aria-label="Young Mens"
            >
              <i className="fa-solid fa-child"></i>
              <span>Young Mens</span>
            </button>
            <button
              type="button"
              className={`icon-button ${organization === 'young-womens' ? 'selected' : ''}`}
              onClick={() => setOrganization('young-womens')}
              aria-label="Young Womens"
            >
              <i className="fa-solid fa-child-dress"></i>
              <span>Young Womens</span>
            </button>
          </div>
        </div>

        <div className="question-group">
          <label className="question-label">
            Did you set or re-evaluate a Come Follow Me goal either individually or with your family?
          </label>
          <div className="radio-group">
            <label className="radio-label">
              <input
                type="radio"
                name="q_did_you_set_a_cfm_goal"
                value="yes"
                checked={q_did_you_set_a_cfm_goal === 'yes'}
                onChange={() => setQDidYouSetACfmGoal('yes')}
              />
              <span>Yes</span>
            </label>
            <label className="radio-label">
              <input
                type="radio"
                name="q_did_you_set_a_cfm_goal"
                value="no"
                checked={q_did_you_set_a_cfm_goal === 'no'}
                onChange={() => setQDidYouSetACfmGoal('no')}
              />
              <span>No</span>
            </label>
          </div>
        </div>

        <div className="question-group">
          <label className="question-label">
            Did you make progress on your goal this week?
          </label>
          <div className="radio-group">
            <label className="radio-label">
              <input
                type="radio"
                name="q_did_you_make_progress_this_week"
                value="yes"
                checked={q_did_you_make_progress_this_week === 'yes'}
                onChange={() => setQDidYouMakeProgressThisWeek('yes')}
              />
              <span>Yes</span>
            </label>
            <label className="radio-label">
              <input
                type="radio"
                name="q_did_you_make_progress_this_week"
                value="no"
                checked={q_did_you_make_progress_this_week === 'no'}
                onChange={() => setQDidYouMakeProgressThisWeek('no')}
              />
              <span>No</span>
            </label>
          </div>
        </div>

      <button type="submit" className="submit-button">
        Submit
      </button>
      </form>
    </div>
  )

  const getChartData = (questionKey: 'q_did_you_set_a_cfm_goal' | 'q_did_you_make_progress_this_week') => {
    const orgLabels = ['Relief Society', 'Elders Quorum', 'Young Mens', 'Young Womens']
    const orgBackendKeys = ['relief society', 'elders quorum', 'young mens', 'young womens']
    
    const yesCounts: number[] = []

    if (surveyReport && surveyReport.question_stats_by_org[questionKey]) {
      // Use backend data
      orgBackendKeys.forEach(orgBackendKey => {
        const orgStats = surveyReport.question_stats_by_org[questionKey][orgBackendKey]
        const yesCount = orgStats?.yes || 0
        yesCounts.push(yesCount)
      })
    } else {
      // Fallback to local state if backend data not available
      const orgKeys: Organization[] = ['relief-society', 'elders-quorum', 'young-mens', 'young-womens']
      
      orgKeys.forEach(org => {
        let yesCount = 0
        surveyResults.forEach(result => {
          if (result.organization === org) {
            if (result[questionKey] === 'yes') yesCount++
          }
        })
        yesCounts.push(yesCount)
      })
    }

    return {
      labels: orgLabels,
      datasets: [
        {
          label: 'Yes',
          data: yesCounts,
          backgroundColor: 'rgba(255, 255, 255, 0.4)',
          borderColor: 'rgba(255, 255, 255, 0.6)',
          borderWidth: 2,
        },
      ],
    }
  }

  const renderReports = () => {
    const chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
        title: {
          display: false,
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: 'white',
          bodyColor: 'white',
          padding: 12,
          cornerRadius: 8,
        },
      },
      scales: {
        x: {
          ticks: {
            color: 'white',
            font: {
              size: 12,
              weight: '500' as const,
            },
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.1)',
          },
        },
        y: {
          beginAtZero: true,
          ticks: {
            color: 'white',
            font: {
              size: 12,
              weight: '500' as const,
            },
            stepSize: 1,
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.1)',
          },
        },
      },
    }

    const cfmGoalData = getChartData('q_did_you_set_a_cfm_goal')
    const progressData = getChartData('q_did_you_make_progress_this_week')

    const hasData = surveyReport && surveyReport.total_responses > 0

    return (
      <div className="reports-container">
        <div className="frosted-glass-card">
          <h1 className="survey-title">Reports</h1>
          <div className="reports-content">
            {isLoadingReports ? (
              <p style={{ color: 'white', textAlign: 'center', fontSize: '1.1rem', padding: '2rem' }}>
                Loading reports...
              </p>
            ) : reportsError ? (
              <p style={{ color: 'white', textAlign: 'center', fontSize: '1.1rem', padding: '2rem' }}>
                Error loading reports: {reportsError}
              </p>
            ) : !hasData ? (
              <p style={{ color: 'white', textAlign: 'center', fontSize: '1.1rem', padding: '2rem' }}>
                No survey data yet. Submit some goals to see reports!
              </p>
            ) : (
              <div className="charts-wrapper">
                <div className="chart-wrapper">
                  <p className="chart-title">Did you set or re-evaluate a Come Follow Me goal either individually or with your family?</p>
                  <div className="chart-container">
                    <Bar 
                      data={{ ...cfmGoalData }} 
                      options={chartOptions} 
                    />
                  </div>
                </div>
                <div className="chart-wrapper">
                  <p className="chart-title">Did you make progress on your goal this week?</p>
                  <div className="chart-container">
                    <Bar 
                      data={{ ...progressData }} 
                      options={chartOptions} 
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  const handleStorySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (storyText.trim() === '') {
      return
    }

    // Show confirmation modal
    setPendingStoryText(storyText.trim())
    setShowConfirmModal(true)
  }

  const confirmStorySubmit = async () => {
    setShowConfirmModal(false)
    const textToSubmit = pendingStoryText

    try {
      const response = await fetch('/stories/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: textToSubmit }),
      })

      if (!response.ok) {
        throw new Error(`Failed to submit story: ${response.statusText}`)
      }

      const newStory: Story = await response.json()
      
      // Refresh stories list
      const storiesResponse = await fetch('/stories/')
      if (storiesResponse.ok) {
        const storiesData: Story[] = await storiesResponse.json()
        setStories(storiesData)
      }
      
      setStoryText('')
      setPendingStoryText('')
    } catch (error) {
      console.error('Error submitting story:', error)
      alert('Failed to submit story. Please try again.')
    }
  }

  const cancelStorySubmit = () => {
    setShowConfirmModal(false)
    setPendingStoryText('')
  }

  const formatTimestamp = (datetimeStr: string) => {
    // Parse datetime string in format "YYYY-MM-DD HH:MM:SS UTC"
    // Convert to ISO format: "YYYY-MM-DDTHH:MM:SSZ"
    const isoStr = datetimeStr.replace(' UTC', '').replace(' ', 'T') + 'Z'
    const date = new Date(isoStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return date.toLocaleDateString()
  }

  const renderStories = () => (
    <div className="stories-container">
      <div className="frosted-glass-card story-input-card">
        <h2 className="story-input-title">Share Your Story</h2>
        <form onSubmit={handleStorySubmit} className="story-form">
          <textarea
            value={storyText}
            onChange={(e) => setStoryText(e.target.value)}
            placeholder="What's on your mind?"
            className="story-textarea"
            rows={4}
          />
          <button type="submit" className="story-submit-button">
            Post Story
          </button>
        </form>
      </div>

      <div className="stories-feed">
        {isLoadingStories ? (
          <div className="frosted-glass-card">
            <p style={{ color: 'white', textAlign: 'center', fontSize: '1.1rem', padding: '2rem' }}>
              Loading stories...
            </p>
          </div>
        ) : storiesError ? (
          <div className="frosted-glass-card">
            <p style={{ color: 'white', textAlign: 'center', fontSize: '1.1rem', padding: '2rem' }}>
              Error loading stories: {storiesError}
            </p>
          </div>
        ) : stories.length === 0 ? (
          <div className="frosted-glass-card">
            <p style={{ color: 'white', textAlign: 'center', fontSize: '1.1rem', padding: '2rem' }}>
              No stories yet. Be the first to share!
            </p>
          </div>
        ) : (
          stories.map((story, index) => (
            <div key={`${story.datetime_submitted}-${index}`} className="frosted-glass-card story-card">
              <div className="story-header">
                <div className="story-avatar">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="8" r="3" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.2"/>
                    <path d="M6 21v-3.5c0-2.5 2-4.5 4.5-4.5h3c2.5 0 4.5 2 4.5 4.5V21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="currentColor" fillOpacity="0.2"/>
                  </svg>
                </div>
                <div className="story-meta">
                  <div className="story-author">Anonymous</div>
                  <div className="story-time">{formatTimestamp(story.datetime_submitted)}</div>
                </div>
              </div>
              <div className="story-content">
                {story.content}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )

  return (
    <div className="app-container">
      <nav className="tab-bar">
        <Link
          to="/"
          className={`tab-button ${activeTab === 'submit-goals' ? 'active' : ''}`}
        >
          Submit Goals
        </Link>
        <Link
          to="/reports"
          className={`tab-button ${activeTab === 'reports' ? 'active' : ''}`}
        >
          Reports
        </Link>
        <Link
          to="/stories"
          className={`tab-button ${activeTab === 'stories' ? 'active' : ''}`}
        >
          Stories
        </Link>
      </nav>

      <div className="content-wrapper">
        <Routes>
          <Route path="/" element={<>{renderSubmitGoals()}</>} />
          <Route path="/reports" element={<>{renderReports()}</>} />
          <Route path="/stories" element={<>{renderStories()}</>} />
        </Routes>
      </div>

      {showConfirmModal && (
        <div className="modal-overlay" onClick={cancelStorySubmit}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">Confirm Post Submission</h2>
            <p className="modal-message">Are you sure you want to submit this post?</p>
            <div className="modal-actions">
              <button
                type="button"
                className="modal-button modal-button-cancel"
                onClick={cancelStorySubmit}
              >
                Cancel
              </button>
              <button
                type="button"
                className="modal-button modal-button-confirm"
                onClick={confirmStorySubmit}
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
