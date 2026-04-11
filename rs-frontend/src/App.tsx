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

type Organization = 'relief-society' | 'elders-quorum' | 'young-mens' | 'young-womens' | null

interface Story {
  datetime_submitted: string
  content: string
}

interface MinisteringReport {
  total_events: number
  counts_by_org: Record<string, number>
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

function App() {
  const location = useLocation()
  const [organization, setOrganization] = useState<Organization>(null)
  const [submitState, setSubmitState] = useState<'idle' | 'submitted'>('idle')
  const [stories, setStories] = useState<Story[]>([])
  const [storyText, setStoryText] = useState<string>('')
  const [ministeringReport, setMinisteringReport] = useState<MinisteringReport | null>(null)
  const [isLoadingReports, setIsLoadingReports] = useState<boolean>(false)
  const [reportsError, setReportsError] = useState<string | null>(null)
  const [isLoadingStories, setIsLoadingStories] = useState<boolean>(false)
  const [storiesError, setStoriesError] = useState<string | null>(null)
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false)
  const [pendingStoryText, setPendingStoryText] = useState<string>('')

  // Determine active tab from location
  const activeTab = location.pathname === '/reports' ? 'reports'
    : location.pathname === '/stories' ? 'stories'
    : 'submit'

  // Fetch ministering reports from backend
  useEffect(() => {
    const fetchReports = async () => {
      setIsLoadingReports(true)
      setReportsError(null)
      try {
        const response = await fetch('/ministering/reports')
        if (!response.ok) {
          throw new Error(`Failed to fetch reports: ${response.statusText}`)
        }
        const data: MinisteringReport = await response.json()
        setMinisteringReport(data)
      } catch (error) {
        console.error('Error fetching reports:', error)
        setReportsError(error instanceof Error ? error.message : 'Failed to fetch reports')
      } finally {
        setIsLoadingReports(false)
      }
    }

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

    if (activeTab === 'stories') {
      fetchStories()
    }
  }, [activeTab])

  const handleMinisteringSubmit = async () => {
    if (organization === null) {
      alert('Please select your organization first.')
      return
    }

    const requestBody = {
      organization: mapOrganizationToBackend(organization),
    }

    try {
      const response = await fetch('/ministering/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        throw new Error(`Failed to submit: ${response.statusText}`)
      }

      setSubmitState('submitted')

      // Reset after 2 seconds
      setTimeout(() => {
        setSubmitState('idle')
        setOrganization(null)
      }, 2000)
    } catch (error) {
      console.error('Error submitting ministering event:', error)
      alert('Failed to submit. Please try again.')
    }
  }

  const renderSubmit = () => (
    <div className="frosted-glass-card">
      <h1 className="survey-title">Ministering Tracker</h1>

      <div className="question-group">
        <label className="question-label">
          Which organization are you in?
        </label>
        <div className="icon-group">
          <button
            type="button"
            className={`icon-button ${organization === 'relief-society' ? 'selected' : ''}`}
            onClick={() => { setOrganization('relief-society'); setSubmitState('idle') }}
            aria-label="Relief Society"
          >
            <i className="fa-solid fa-person-dress"></i>
            <span>Relief Society</span>
          </button>
          <button
            type="button"
            className={`icon-button ${organization === 'elders-quorum' ? 'selected' : ''}`}
            onClick={() => { setOrganization('elders-quorum'); setSubmitState('idle') }}
            aria-label="Elders Quorum"
          >
            <i className="fa-solid fa-user-tie"></i>
            <span>Elders Quorum</span>
          </button>
          <button
            type="button"
            className={`icon-button ${organization === 'young-mens' ? 'selected' : ''}`}
            onClick={() => { setOrganization('young-mens'); setSubmitState('idle') }}
            aria-label="Young Mens"
          >
            <i className="fa-solid fa-child"></i>
            <span>Young Mens</span>
          </button>
          <button
            type="button"
            className={`icon-button ${organization === 'young-womens' ? 'selected' : ''}`}
            onClick={() => { setOrganization('young-womens'); setSubmitState('idle') }}
            aria-label="Young Womens"
          >
            <i className="fa-solid fa-child-dress"></i>
            <span>Young Womens</span>
          </button>
        </div>
      </div>

      <button
        type="button"
        className={`ministering-button ${submitState === 'submitted' ? 'submitted' : ''}`}
        onClick={handleMinisteringSubmit}
        disabled={submitState === 'submitted'}
      >
        {submitState === 'submitted' ? (
          <><span className="check-icon"><i className="fa-solid fa-circle-check"></i></span> Recorded! Thank you.</>
        ) : (
          <><i className="fa-solid fa-hands-holding-heart"></i> I Was Ministered To</>
        )}
      </button>
      <p className="submit-hint">Tap to record that you felt supported or ministered to</p>
    </div>
  )

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

    const orgLabels = ['Relief Society', 'Elders Quorum', 'Young Mens', 'Young Womens']
    const orgBackendKeys = ['relief society', 'elders quorum', 'young mens', 'young womens']

    const counts = orgBackendKeys.map(key =>
      ministeringReport?.counts_by_org[key] || 0
    )

    const chartData = {
      labels: orgLabels,
      datasets: [
        {
          label: 'Times Ministered To',
          data: counts,
          backgroundColor: 'rgba(255, 255, 255, 0.4)',
          borderColor: 'rgba(255, 255, 255, 0.6)',
          borderWidth: 2,
        },
      ],
    }

    const hasData = ministeringReport && ministeringReport.total_events > 0

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
                No data yet. Record a ministering event to see reports!
              </p>
            ) : (
              <div className="charts-wrapper">
                <div className="chart-wrapper">
                  <p className="chart-title">Times Members Felt Ministered To &mdash; by Organization</p>
                  <div className="chart-container">
                    <Bar
                      data={chartData}
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
            placeholder="Share a time you felt supported or ministered to..."
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
          className={`tab-button ${activeTab === 'submit' ? 'active' : ''}`}
        >
          Submit
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
          <Route path="/" element={<>{renderSubmit()}</>} />
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
