import { useState } from 'react'
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
type Tab = 'submit-goals' | 'reports' | 'stories'

interface Story {
  id: string
  text: string
  timestamp: Date
}

interface SurveyResult {
  organization: Organization
  q_did_you_set_a_cfm_goal: Answer
  q_did_you_make_progress_this_week: Answer
}

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('submit-goals')
  const [organization, setOrganization] = useState<Organization>(null)
  const [q_did_you_set_a_cfm_goal, setQDidYouSetACfmGoal] = useState<Answer>(null)
  const [q_did_you_make_progress_this_week, setQDidYouMakeProgressThisWeek] = useState<Answer>(null)
  const [stories, setStories] = useState<Story[]>([])
  const [storyText, setStoryText] = useState<string>('')
  const [surveyResults, setSurveyResults] = useState<SurveyResult[]>([])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
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
    
    setSurveyResults(prev => [...prev, results])
    console.log('Survey results:', results)
    alert('Thank you for completing the survey!')
    
    // Reset form
    setOrganization(null)
    setQDidYouSetACfmGoal(null)
    setQDidYouMakeProgressThisWeek(null)
  }

  const renderSubmitGoals = () => (
    <div className="frosted-glass-card">
      <h1 className="survey-title">Relief Society Survey</h1>
      
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

      <button type="button" onClick={handleSubmit} className="submit-button">
        Submit
      </button>
    </div>
  )

  const getChartData = (questionKey: 'q_did_you_set_a_cfm_goal' | 'q_did_you_make_progress_this_week') => {
    const orgLabels = ['Relief Society', 'Elders Quorum', 'Young Mens', 'Young Womens']
    const orgKeys: Organization[] = ['relief-society', 'elders-quorum', 'young-mens', 'young-womens']
    
    const yesCounts: number[] = []

    orgKeys.forEach(org => {
      let yesCount = 0

      surveyResults.forEach(result => {
        if (result.organization === org) {
          // Count yes for the specific question
          if (result[questionKey] === 'yes') yesCount++
        }
      })

      yesCounts.push(yesCount)
    })

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
          display: true,
          text: '',
          color: 'white',
          font: {
            size: 18,
            weight: '600' as const,
          },
          padding: {
            top: 10,
            bottom: 20,
          },
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

    return (
      <div className="reports-container">
        <div className="frosted-glass-card">
          <h1 className="survey-title">Reports</h1>
          <div className="reports-content">
            {surveyResults.length === 0 ? (
              <p style={{ color: 'white', textAlign: 'center', fontSize: '1.1rem', padding: '2rem' }}>
                No survey data yet. Submit some goals to see reports!
              </p>
            ) : (
              <div className="charts-wrapper">
                <div className="chart-wrapper">
                  <div className="chart-container">
                    <Bar 
                      data={{ ...cfmGoalData }} 
                      options={{ ...chartOptions, plugins: { ...chartOptions.plugins, title: { ...chartOptions.plugins.title, text: 'Did you set or re-evaluate a Come Follow Me goal either individually or with your family?' } } }} 
                    />
                  </div>
                </div>
                <div className="chart-wrapper">
                  <div className="chart-container">
                    <Bar 
                      data={{ ...progressData }} 
                      options={{ ...chartOptions, plugins: { ...chartOptions.plugins, title: { ...chartOptions.plugins.title, text: 'Did you make progress on your goal this week?' } } }} 
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

  const handleStorySubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (storyText.trim() === '') {
      return
    }

    const newStory: Story = {
      id: Date.now().toString(),
      text: storyText.trim(),
      timestamp: new Date()
    }

    setStories(prev => [newStory, ...prev])
    setStoryText('')
  }

  const formatTimestamp = (date: Date) => {
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
        {stories.length === 0 ? (
          <div className="frosted-glass-card">
            <p style={{ color: 'white', textAlign: 'center', fontSize: '1.1rem', padding: '2rem' }}>
              No stories yet. Be the first to share!
            </p>
          </div>
        ) : (
          stories.map((story) => (
            <div key={story.id} className="frosted-glass-card story-card">
              <div className="story-header">
                <div className="story-avatar">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="8" r="3" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.2"/>
                    <path d="M6 21v-3.5c0-2.5 2-4.5 4.5-4.5h3c2.5 0 4.5 2 4.5 4.5V21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="currentColor" fillOpacity="0.2"/>
                  </svg>
                </div>
                <div className="story-meta">
                  <div className="story-author">Anonymous</div>
                  <div className="story-time">{formatTimestamp(story.timestamp)}</div>
                </div>
              </div>
              <div className="story-content">
                {story.text}
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
        <button
          type="button"
          className={`tab-button ${activeTab === 'submit-goals' ? 'active' : ''}`}
          onClick={() => setActiveTab('submit-goals')}
        >
          Submit Goals
        </button>
        <button
          type="button"
          className={`tab-button ${activeTab === 'reports' ? 'active' : ''}`}
          onClick={() => setActiveTab('reports')}
        >
          Reports
        </button>
        <button
          type="button"
          className={`tab-button ${activeTab === 'stories' ? 'active' : ''}`}
          onClick={() => setActiveTab('stories')}
        >
          Stories
        </button>
      </nav>

      <div className="content-wrapper">
        {activeTab === 'submit-goals' && renderSubmitGoals()}
        {activeTab === 'reports' && renderReports()}
        {activeTab === 'stories' && renderStories()}
      </div>
    </div>
  )
}

export default App
