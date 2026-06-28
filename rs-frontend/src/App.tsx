import { useState, useEffect, useRef } from 'react'
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

interface MissionaryExperienceReport {
  total_answers: number
  counts_by_org: Record<string, number>
}

interface BackendQuestion {
  id: number
  text: string
}

const OTHER_QUESTION_ID = 15

// Short labels shown under the "Did you..." title (leading "Did you" clipped).
const QUESTION_SHORT_LABELS: Record<number, string> = {
  1: 'have the missionaries over for dinner?',
  2: 'give someone a ride?',
  3: 'reach out to your ministering families?',
  4: 'pray for a missionary experience?',
  5: 'pray for the families to whom you minister?',
  6: 'have your ministering interview?',
  7: 'fill out a BINGO square?',
  8: 'invite a friend or neighbor to an activity?',
  9: 'take a friend with you to the temple?',
  10: 'share a conference talk or scripture?',
  11: "answer someone's question about your church?",
  12: 'make an invitation this week?',
  13: 'join a lesson with the missionaries?',
  14: 'sit by someone new at church?',
  15: 'Other:',
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
  const [report, setReport] = useState<MissionaryExperienceReport | null>(null)
  const [isLoadingReports, setIsLoadingReports] = useState<boolean>(false)
  const [reportsError, setReportsError] = useState<string | null>(null)
  const [isLoadingStories, setIsLoadingStories] = useState<boolean>(false)
  const [storiesError, setStoriesError] = useState<string | null>(null)
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false)
  const [pendingStoryText, setPendingStoryText] = useState<string>('')
  const [showCountdownModal, setShowCountdownModal] = useState<boolean>(false)
  const [countdown, setCountdown] = useState<number>(5)
  const [showCelebration, setShowCelebration] = useState<boolean>(false)
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<number>>(new Set())
  const [otherText, setOtherText] = useState<string>('')
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const confettiCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const pendingOrgRef = useRef<Organization>(null)
  const pendingAnswersRef = useRef<Array<{ question_id: number; other_text?: string }>>([])

  // Determine active tab from location
  const activeTab = location.pathname === '/reports' ? 'reports'
    : location.pathname === '/stories' ? 'stories'
    : 'submit'

  // Fetch report data from backend
  useEffect(() => {
    const fetchReports = async () => {
      setIsLoadingReports(true)
      setReportsError(null)
      try {
        const response = await fetch('/missionary-experience/reports')
        if (!response.ok) {
          throw new Error(`Failed to fetch reports: ${response.statusText}`)
        }
        const data: MissionaryExperienceReport = await response.json()
        setReport(data)
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

  const toggleQuestion = (qid: number) => {
    setSelectedQuestionIds(prev => {
      const next = new Set(prev)
      if (next.has(qid)) {
        next.delete(qid)
      } else {
        next.add(qid)
      }
      return next
    })
    setSubmitState('idle')
  }

  const handleMissionarySubmit = () => {
    if (organization === null) {
      alert('Please select your organization first.')
      return
    }
    if (selectedQuestionIds.size === 0) {
      alert('Please select at least one experience before submitting.')
      return
    }
    if (
      selectedQuestionIds.has(OTHER_QUESTION_ID) &&
      otherText.trim().length === 0
    ) {
      alert('You selected "Other" — please describe your experience.')
      return
    }
    const answers = Array.from(selectedQuestionIds)
      .sort((a, b) => a - b)
      .map(qid =>
        qid === OTHER_QUESTION_ID
          ? { question_id: qid, other_text: otherText.trim() }
          : { question_id: qid },
      )
    pendingOrgRef.current = organization
    pendingAnswersRef.current = answers
    setCountdown(5)
    setShowCountdownModal(true)
  }

  const executeSubmit = async () => {
    setShowCountdownModal(false)
    const org = pendingOrgRef.current
    const answers = pendingAnswersRef.current
    if (!org || answers.length === 0) return

    const requestBody = {
      organization: mapOrganizationToBackend(org),
      answers,
    }

    try {
      const response = await fetch('/missionary-experience/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        throw new Error(`Failed to submit: ${response.statusText}`)
      }

      setShowCelebration(true)
      setSubmitState('submitted')

      setTimeout(() => {
        setSubmitState('idle')
        setOrganization(null)
        setSelectedQuestionIds(new Set())
        setOtherText('')
      }, 4000)
    } catch (error) {
      console.error('Error submitting missionary experience:', error)
      alert('Failed to submit. Please try again.')
    }
    pendingOrgRef.current = null
    pendingAnswersRef.current = []
  }

  const cancelCountdown = () => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current)
      countdownTimerRef.current = null
    }
    setShowCountdownModal(false)
    setCountdown(5)
  }

  // Countdown timer effect
  useEffect(() => {
    if (!showCountdownModal) return
    countdownTimerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownTimerRef.current!)
          countdownTimerRef.current = null
          executeSubmit()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current)
        countdownTimerRef.current = null
      }
    }
  }, [showCountdownModal])

  // Confetti spray effect — two bursts from bottom corners
  useEffect(() => {
    if (!showCelebration) return
    const canvas = document.createElement('canvas')
    canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:2000;pointer-events:none;transition:opacity 0.8s ease'
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    document.body.appendChild(canvas)
    confettiCanvasRef.current = canvas
    const ctx = canvas.getContext('2d')!

    const colors = ['#FFB3BA', '#BAFFC9', '#BAE1FF', '#FFFFBA', '#E8BAFF', '#FFDAB9', '#C9FFE5']
    const gravity = 0.12

    type Particle = { x: number; y: number; vx: number; vy: number; color: string; size: number; rotation: number; rotationSpeed: number; shape: 'rect' | 'circle'; alpha: number }

    const sprayFromCorner = (fromRight: boolean): Particle[] => {
      const originX = fromRight ? canvas.width : 0
      const originY = canvas.height
      const spreadAngle = fromRight ? Math.PI * 0.6 : Math.PI * 0.4
      const baseAngle = fromRight ? Math.PI + spreadAngle / 2 : Math.PI * 2 - spreadAngle / 2

      return Array.from({ length: 80 }, () => {
        const angle = baseAngle + (fromRight ? -1 : 1) * Math.random() * spreadAngle
        const speed = 8 + Math.random() * 12
        return {
          x: originX,
          y: originY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          color: colors[Math.floor(Math.random() * colors.length)],
          size: Math.random() * 8 + 4,
          rotation: Math.random() * 360,
          rotationSpeed: (Math.random() - 0.5) * 8,
          shape: (Math.random() > 0.5 ? 'rect' : 'circle') as 'rect' | 'circle',
          alpha: 1,
        }
      })
    }

    const particles: Particle[] = [...sprayFromCorner(true)]

    const secondSprayTimer = setTimeout(() => {
      particles.push(...sprayFromCorner(false))
    }, 400)

    let animId: number
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      particles.forEach(p => {
        p.x += p.vx
        p.y += p.vy
        p.vy += gravity
        p.vx *= 0.99
        p.rotation += p.rotationSpeed
        p.alpha = Math.max(0, p.alpha - 0.003)
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate((p.rotation * Math.PI) / 180)
        ctx.fillStyle = p.color
        ctx.globalAlpha = p.alpha
        if (p.shape === 'rect') {
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.5)
        } else {
          ctx.beginPath()
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.restore()
      })
      animId = requestAnimationFrame(draw)
    }
    draw()

    const fadeOut = setTimeout(() => {
      canvas.style.opacity = '0'
      setTimeout(() => {
        cancelAnimationFrame(animId)
        canvas.remove()
        confettiCanvasRef.current = null
        setShowCelebration(false)
      }, 800)
    }, 3500)

    return () => {
      clearTimeout(secondSprayTimer)
      clearTimeout(fadeOut)
      cancelAnimationFrame(animId)
      canvas.remove()
    }
  }, [showCelebration])

  // Static catalog of questions — IDs match backend (rs_backend/questions.py).
  const questions: BackendQuestion[] = Array.from({ length: 15 }, (_, i) => ({
    id: i + 1,
    text: QUESTION_SHORT_LABELS[i + 1],
  }))

  const accordionOpen = organization !== null

  // Display labels used in the dynamic submit hint (per design feedback).
  const ORG_DISPLAY_LABELS: Record<Exclude<Organization, null>, string> = {
    'relief-society': 'Relief Society',
    'elders-quorum': "Elder's Quorum",
    'young-mens': 'Young Men',
    'young-womens': 'Young Women',
  }

  const renderSubmit = () => (
    <div className="frosted-glass-card">
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

      <div
        className={`accordion ${accordionOpen ? 'open' : ''}`}
        aria-hidden={!accordionOpen}
      >
        <div className="accordion-inner">
          <div className="question-group">
            <h2 className="section-heading">Missionary Experience</h2>
            <p className="question-label question-prompt">
              Did you... (select all that apply)
            </p>
            <ul className="checkbox-list">
              {questions.map((q) => {
                const checked = selectedQuestionIds.has(q.id)
                const isOther = q.id === OTHER_QUESTION_ID
                return (
                  <li
                    key={q.id}
                    className={`checkbox-row ${checked ? 'checked' : ''} ${isOther ? 'other-row' : ''}`}
                  >
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleQuestion(q.id)}
                      />
                      <span className="checkbox-text">{q.text}</span>
                    </label>
                    {isOther && checked && (
                      <input
                        type="text"
                        className="other-input"
                        placeholder="Describe your experience…"
                        value={otherText}
                        onChange={(e) => setOtherText(e.target.value)}
                        autoFocus
                      />
                    )}
                  </li>
                )
              })}
            </ul>
          </div>

          <button
            type="button"
            className={`ministering-button ${submitState === 'submitted' ? 'submitted' : ''}`}
            onClick={handleMissionarySubmit}
            disabled={submitState === 'submitted'}
          >
            {submitState === 'submitted' ? (
              <><span className="check-icon"><i className="fa-solid fa-circle-check"></i></span> Recorded! Thank you.</>
            ) : (
              <><i className="fa-solid fa-hands-holding-heart"></i> Submit</>
            )}
          </button>
          {organization !== null && (
            <p className="submit-hint">
              Each item counts as +1 point for the {ORG_DISPLAY_LABELS[organization]}.
            </p>
          )}
        </div>
      </div>
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
      report?.counts_by_org[key] || 0
    )

    const chartData = {
      labels: orgLabels,
      datasets: [
        {
          label: 'Missionary Experiences',
          data: counts,
          backgroundColor: 'rgba(255, 255, 255, 0.4)',
          borderColor: 'rgba(255, 255, 255, 0.6)',
          borderWidth: 2,
        },
      ],
    }

    const hasData = report && report.total_answers > 0

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
                No data yet. Submit a missionary experience to see reports!
              </p>
            ) : (
              <div className="charts-wrapper">
                <div className="chart-wrapper">
                  <p className="chart-title">Missionary Experiences Recorded &mdash; by Organization</p>
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

      {showCountdownModal && (
        <div className="countdown-modal-overlay" onClick={cancelCountdown}>
          <div className="countdown-modal-content" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">Submitting...</h2>
            <p className="modal-message">Auto-submitting in...</p>
            <div className="countdown-ring-wrapper">
              <svg className="countdown-ring" viewBox="0 0 100 100">
                <circle className="countdown-ring-bg" cx="50" cy="50" r="42" />
                <circle
                  className="countdown-ring-progress"
                  cx="50" cy="50" r="42"
                  style={{ strokeDashoffset: `${264 * (5 - countdown) / 5}` }}
                />
              </svg>
              <span className="countdown-number">{countdown}</span>
            </div>
            <div className="modal-actions" style={{ justifyContent: 'center' }}>
              <button
                type="button"
                className="modal-button modal-button-cancel"
                onClick={cancelCountdown}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
