import { EventEmitter } from 'node:events'

export interface User {
  id: string
  username: string
  email: string
  displayName: string
  bio?: string
  avatar?: string
  reputation: number
  credentials: string[]
  createdAt: Date
  updatedAt: Date
}

export interface Question {
  id: string
  title: string
  content: string
  authorId: string
  tags: string[]
  views: number
  upvotes: number
  downvotes: number
  answers: number
  isAnswered: boolean
  isClosed: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Answer {
  id: string
  questionId: string
  authorId: string
  content: string
  upvotes: number
  downvotes: number
  isAccepted: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Comment {
  id: string
  parentId: string // questionId or answerId
  parentType: 'question' | 'answer'
  authorId: string
  content: string
  upvotes: number
  downvotes: number
  createdAt: Date
  updatedAt: Date
}

export interface Vote {
  id: string
  userId: string
  targetId: string
  targetType: 'question' | 'answer' | 'comment'
  voteType: 'upvote' | 'downvote'
  createdAt: Date
}

export interface Topic {
  id: string
  name: string
  description: string
  followers: number
  questions: number
  createdAt: Date
}

export interface Follow {
  id: string
  followerId: string
  followingId: string
  createdAt: Date
}

export interface TopicFollow {
  id: string
  userId: string
  topicId: string
  createdAt: Date
}

export interface QuoraOptions {
  maxQuestionLength?: number
  maxAnswerLength?: number
  maxCommentLength?: number
  reputationThreshold?: number
}

export class QuoraSystem extends EventEmitter {
  private users: Map<string, User> = new Map()
  private questions: Map<string, Question> = new Map()
  private answers: Map<string, Answer> = new Map()
  private comments: Map<string, Comment> = new Map()
  private votes: Map<string, Vote> = new Map()
  private topics: Map<string, Topic> = new Map()
  private follows: Map<string, Follow> = new Map()
  private topicFollows: Map<string, TopicFollow> = new Map()

  private questionAnswers: Map<string, string[]> = new Map()
  private questionComments: Map<string, string[]> = new Map()
  private answerComments: Map<string, string[]> = new Map()
  private userQuestions: Map<string, string[]> = new Map()
  private userAnswers: Map<string, string[]> = new Map()
  private userComments: Map<string, string[]> = new Map()
  private userVotes: Map<string, string[]> = new Map()
  private userFollowing: Map<string, string[]> = new Map()
  private userFollowers: Map<string, string[]> = new Map()
  private topicQuestions: Map<string, string[]> = new Map()
  private topicFollowers: Map<string, string[]> = new Map()

  private maxQuestionLength: number
  private maxAnswerLength: number
  private maxCommentLength: number
  private reputationThreshold: number

  constructor(options: QuoraOptions = {}) {
    super()
    this.maxQuestionLength = options.maxQuestionLength || 10000
    this.maxAnswerLength = options.maxAnswerLength || 50000
    this.maxCommentLength = options.maxCommentLength || 2000
    this.reputationThreshold = options.reputationThreshold || 100
    this.initializeDefaultData()
  }

  private initializeDefaultData(): void {
    // Create some default users
    this.createUser({
      id: 'user1',
      username: 'john_doe',
      email: 'john@example.com',
      displayName: 'John Doe',
      bio: 'Software engineer and tech enthusiast',
      credentials: ['Software Engineer at Tech Corp', 'Computer Science Graduate'],
      reputation: 1250,
    })

    this.createUser({
      id: 'user2',
      username: 'jane_smith',
      email: 'jane@example.com',
      displayName: 'Jane Smith',
      bio: 'Data scientist and AI researcher',
      credentials: ['Data Scientist at AI Labs', 'PhD in Machine Learning'],
      reputation: 2100,
    })

    this.createUser({
      id: 'user3',
      username: 'bob_wilson',
      email: 'bob@example.com',
      displayName: 'Bob Wilson',
      bio: 'Entrepreneur and startup advisor',
      credentials: ['Founder of StartupXYZ', 'MBA from Harvard'],
      reputation: 3200,
    })

    // Create some default topics
    this.createTopic({
      id: 'topic1',
      name: 'Programming',
      description: 'Questions about programming languages, frameworks, and software development',
    })

    this.createTopic({
      id: 'topic2',
      name: 'Machine Learning',
      description: 'Questions about artificial intelligence, machine learning, and data science',
    })

    this.createTopic({
      id: 'topic3',
      name: 'Entrepreneurship',
      description: 'Questions about starting and running businesses',
    })

    // Create some default questions
    this.createQuestion({
      id: 'q1',
      title: 'What are the best practices for writing clean code?',
      content: 'I am a junior developer and want to learn about clean code practices. What are the most important principles I should follow?',
      authorId: 'user1',
      tags: ['programming', 'clean-code', 'best-practices'],
    })

    this.createQuestion({
      id: 'q2',
      title: 'How do neural networks learn?',
      content: 'Can someone explain in simple terms how neural networks learn from data? What is backpropagation?',
      authorId: 'user2',
      tags: ['machine-learning', 'neural-networks', 'ai'],
    })

    this.createQuestion({
      id: 'q3',
      title: 'What should I consider before starting a tech startup?',
      content: 'I have an idea for a tech startup but I am not sure where to begin. What are the key things I should consider?',
      authorId: 'user3',
      tags: ['entrepreneurship', 'startup', 'business'],
    })

    // Create some default answers
    this.createAnswer({
      id: 'a1',
      questionId: 'q1',
      authorId: 'user2',
      content: 'Here are some key clean code principles:\n\n1. Use meaningful names for variables and functions\n2. Keep functions small and focused\n3. Avoid deep nesting\n4. Write self-documenting code\n5. Follow the DRY principle (Don\'t Repeat Yourself)\n6. Use consistent formatting and style\n7. Write unit tests\n8. Refactor regularly',
    })

    this.createAnswer({
      id: 'a2',
      questionId: 'q2',
      authorId: 'user1',
      content: 'Neural networks learn through a process called backpropagation. Here\'s a simplified explanation:\n\n1. The network makes a prediction\n2. It compares the prediction to the actual answer\n3. It calculates how wrong it was (the error)\n4. It adjusts the weights in the network to reduce the error\n5. This process repeats many times until the network gets good at making predictions',
    })

    // Create some follows
    this.followUser('user2', 'user1')
    this.followUser('user3', 'user1')
    this.followUser('user1', 'user2')

    // Create some topic follows
    this.followTopic('user1', 'topic1')
    this.followTopic('user2', 'topic2')
    this.followTopic('user3', 'topic3')
  }

  // User Management
  public createUser(userData: Omit<User, 'reputation' | 'createdAt' | 'updatedAt'>): User {
    const now = new Date()
    const user: User = {
      ...userData,
      reputation: 0,
      createdAt: now,
      updatedAt: now,
    }

    this.users.set(user.id, user)
    this.userQuestions.set(user.id, [])
    this.userAnswers.set(user.id, [])
    this.userComments.set(user.id, [])
    this.userVotes.set(user.id, [])
    this.userFollowing.set(user.id, [])
    this.userFollowers.set(user.id, [])

    this.emit('userCreated', user)
    return user
  }

  public getUser(userId: string): User | undefined {
    return this.users.get(userId)
  }

  public updateUser(userId: string, updates: Partial<Omit<User, 'id' | 'reputation' | 'createdAt'>>): User | null {
    const user = this.users.get(userId)
    if (!user)
      return null

    const updatedUser: User = {
      ...user,
      ...updates,
      updatedAt: new Date(),
    }

    this.users.set(userId, updatedUser)
    this.emit('userUpdated', updatedUser)
    return updatedUser
  }

  public deleteUser(userId: string): boolean {
    if (!this.users.has(userId))
      return false

    // Delete user's questions, answers, and comments
    const userQuestions = this.userQuestions.get(userId) || []
    userQuestions.forEach(questionId => this.deleteQuestion(questionId))

    const userAnswers = this.userAnswers.get(userId) || []
    userAnswers.forEach(answerId => this.deleteAnswer(answerId))

    const userComments = this.userComments.get(userId) || []
    userComments.forEach(commentId => this.deleteComment(commentId))

    // Remove from follows
    const following = this.userFollowing.get(userId) || []
    following.forEach(followingId => this.unfollowUser(userId, followingId))

    const followers = this.userFollowers.get(userId) || []
    followers.forEach(followerId => this.unfollowUser(followerId, userId))

    // Clean up data structures
    this.users.delete(userId)
    this.userQuestions.delete(userId)
    this.userAnswers.delete(userId)
    this.userComments.delete(userId)
    this.userVotes.delete(userId)
    this.userFollowing.delete(userId)
    this.userFollowers.delete(userId)

    this.emit('userDeleted', { userId })
    return true
  }

  // Question Management
  public createQuestion(questionData: Omit<Question, 'views' | 'upvotes' | 'downvotes' | 'answers' | 'isAnswered' | 'isClosed' | 'createdAt' | 'updatedAt'>): Question {
    if (questionData.content.length > this.maxQuestionLength)
      throw new Error('Question content exceeds maximum length')

    const now = new Date()
    const question: Question = {
      ...questionData,
      views: 0,
      upvotes: 0,
      downvotes: 0,
      answers: 0,
      isAnswered: false,
      isClosed: false,
      createdAt: now,
      updatedAt: now,
    }

    this.questions.set(question.id, question)
    this.userQuestions.get(question.authorId)?.push(question.id)
    this.questionAnswers.set(question.id, [])
    this.questionComments.set(question.id, [])

    // Add to topic questions
    question.tags.forEach((tag) => {
      const topic = this.findTopicByName(tag)
      if (topic)
        this.topicQuestions.get(topic.id)?.push(question.id)
    })

    this.emit('questionCreated', question)
    return question
  }

  public getQuestion(questionId: string): Question | undefined {
    return this.questions.get(questionId)
  }

  public updateQuestion(questionId: string, updates: Partial<Omit<Question, 'id' | 'authorId' | 'views' | 'upvotes' | 'downvotes' | 'answers' | 'createdAt'>>): Question | null {
    const question = this.questions.get(questionId)
    if (!question)
      return null

    if (updates.content && updates.content.length > this.maxQuestionLength)
      throw new Error('Question content exceeds maximum length')

    const updatedQuestion: Question = {
      ...question,
      ...updates,
      updatedAt: new Date(),
    }

    this.questions.set(questionId, updatedQuestion)
    this.emit('questionUpdated', updatedQuestion)
    return updatedQuestion
  }

  public deleteQuestion(questionId: string): boolean {
    const question = this.questions.get(questionId)
    if (!question)
      return false

    // Remove from user's questions
    const userQuestions = this.userQuestions.get(question.authorId) || []
    const index = userQuestions.indexOf(questionId)
    if (index > -1)
      userQuestions.splice(index, 1)

    // Delete associated answers and comments
    const answerIds = this.questionAnswers.get(questionId) || []
    answerIds.forEach(answerId => this.deleteAnswer(answerId))

    const commentIds = this.questionComments.get(questionId) || []
    commentIds.forEach(commentId => this.deleteComment(commentId))

    // Clean up data structures
    this.questions.delete(questionId)
    this.questionAnswers.delete(questionId)
    this.questionComments.delete(questionId)

    this.emit('questionDeleted', { questionId })
    return true
  }

  // Answer Management
  public createAnswer(answerData: Omit<Answer, 'upvotes' | 'downvotes' | 'isAccepted' | 'createdAt' | 'updatedAt'>): Answer {
    if (answerData.content.length > this.maxAnswerLength)
      throw new Error('Answer content exceeds maximum length')

    const now = new Date()
    const answer: Answer = {
      ...answerData,
      upvotes: 0,
      downvotes: 0,
      isAccepted: false,
      createdAt: now,
      updatedAt: now,
    }

    this.answers.set(answer.id, answer)
    this.questionAnswers.get(answer.questionId)?.push(answer.id)
    this.userAnswers.get(answer.authorId)?.push(answer.id)
    this.answerComments.set(answer.id, [])

    // Update question answer count
    const question = this.questions.get(answer.questionId)
    if (question) {
      question.answers++
      this.questions.set(answer.questionId, question)
    }

    this.emit('answerCreated', answer)
    return answer
  }

  public getAnswer(answerId: string): Answer | undefined {
    return this.answers.get(answerId)
  }

  public updateAnswer(answerId: string, updates: Partial<Omit<Answer, 'id' | 'questionId' | 'authorId' | 'upvotes' | 'downvotes' | 'createdAt'>>): Answer | null {
    const answer = this.answers.get(answerId)
    if (!answer)
      return null

    if (updates.content && updates.content.length > this.maxAnswerLength)
      throw new Error('Answer content exceeds maximum length')

    const updatedAnswer: Answer = {
      ...answer,
      ...updates,
      updatedAt: new Date(),
    }

    this.answers.set(answerId, updatedAnswer)
    this.emit('answerUpdated', updatedAnswer)
    return updatedAnswer
  }

  public deleteAnswer(answerId: string): boolean {
    const answer = this.answers.get(answerId)
    if (!answer)
      return false

    // Remove from question's answers
    const questionAnswers = this.questionAnswers.get(answer.questionId) || []
    const index = questionAnswers.indexOf(answerId)
    if (index > -1)
      questionAnswers.splice(index, 1)

    // Remove from user's answers
    const userAnswers = this.userAnswers.get(answer.authorId) || []
    const userIndex = userAnswers.indexOf(answerId)
    if (userIndex > -1)
      userAnswers.splice(userIndex, 1)

    // Update question answer count
    const question = this.questions.get(answer.questionId)
    if (question) {
      question.answers--
      this.questions.set(answer.questionId, question)
    }

    // Delete associated comments
    const commentIds = this.answerComments.get(answerId) || []
    commentIds.forEach(commentId => this.deleteComment(commentId))

    // Clean up data structures
    this.answers.delete(answerId)
    this.answerComments.delete(answerId)

    this.emit('answerDeleted', { answerId })
    return true
  }

  public acceptAnswer(answerId: string): boolean {
    const answer = this.answers.get(answerId)
    if (!answer)
      return false

    // Unaccept any previously accepted answer for this question
    const questionAnswers = this.questionAnswers.get(answer.questionId) || []
    questionAnswers.forEach((id) => {
      const existingAnswer = this.answers.get(id)
      if (existingAnswer && existingAnswer.isAccepted) {
        existingAnswer.isAccepted = false
        this.answers.set(id, existingAnswer)
      }
    })

    // Accept this answer
    answer.isAccepted = true
    this.answers.set(answerId, answer)

    // Mark question as answered
    const question = this.questions.get(answer.questionId)
    if (question) {
      question.isAnswered = true
      this.questions.set(answer.questionId, question)
    }

    this.emit('answerAccepted', { answerId, questionId: answer.questionId })
    return true
  }

  // Comment Management
  public createComment(commentData: Omit<Comment, 'upvotes' | 'downvotes' | 'createdAt' | 'updatedAt'>): Comment {
    if (commentData.content.length > this.maxCommentLength)
      throw new Error('Comment content exceeds maximum length')

    const now = new Date()
    const comment: Comment = {
      ...commentData,
      upvotes: 0,
      downvotes: 0,
      createdAt: now,
      updatedAt: now,
    }

    this.comments.set(comment.id, comment)
    this.userComments.get(comment.authorId)?.push(comment.id)

    if (comment.parentType === 'question')
      this.questionComments.get(comment.parentId)?.push(comment.id)
    else
      this.answerComments.get(comment.parentId)?.push(comment.id)

    this.emit('commentCreated', comment)
    return comment
  }

  public getComment(commentId: string): Comment | undefined {
    return this.comments.get(commentId)
  }

  public updateComment(commentId: string, updates: Partial<Omit<Comment, 'id' | 'parentId' | 'parentType' | 'authorId' | 'upvotes' | 'downvotes' | 'createdAt'>>): Comment | null {
    const comment = this.comments.get(commentId)
    if (!comment)
      return null

    if (updates.content && updates.content.length > this.maxCommentLength)
      throw new Error('Comment content exceeds maximum length')

    const updatedComment: Comment = {
      ...comment,
      ...updates,
      updatedAt: new Date(),
    }

    this.comments.set(commentId, updatedComment)
    this.emit('commentUpdated', updatedComment)
    return updatedComment
  }

  public deleteComment(commentId: string): boolean {
    const comment = this.comments.get(commentId)
    if (!comment)
      return false

    // Remove from parent's comments
    if (comment.parentType === 'question') {
      const questionComments = this.questionComments.get(comment.parentId) || []
      const index = questionComments.indexOf(commentId)
      if (index > -1)
        questionComments.splice(index, 1)
    }
    else {
      const answerComments = this.answerComments.get(comment.parentId) || []
      const index = answerComments.indexOf(commentId)
      if (index > -1)
        answerComments.splice(index, 1)
    }

    // Remove from user's comments
    const userComments = this.userComments.get(comment.authorId) || []
    const userIndex = userComments.indexOf(commentId)
    if (userIndex > -1)
      userComments.splice(userIndex, 1)

    this.comments.delete(commentId)
    this.emit('commentDeleted', { commentId })
    return true
  }

  // Vote Management
  public vote(targetId: string, targetType: 'question' | 'answer' | 'comment', userId: string, voteType: 'upvote' | 'downvote'): Vote | null {
    const voteId = `${userId}-${targetId}`

    // Check if user already voted
    if (this.votes.has(voteId))
      return null // Already voted

    const vote: Vote = {
      id: voteId,
      userId,
      targetId,
      targetType,
      voteType,
      createdAt: new Date(),
    }

    this.votes.set(voteId, vote)
    this.userVotes.get(userId)?.push(voteId)

    // Update target's vote count
    this.updateVoteCount(targetId, targetType, voteType, 1)

    this.emit('voteCreated', vote)
    return vote
  }

  public removeVote(targetId: string, targetType: 'question' | 'answer' | 'comment', userId: string): boolean {
    const voteId = `${userId}-${targetId}`
    const vote = this.votes.get(voteId)
    if (!vote)
      return false

    this.votes.delete(voteId)

    // Remove from user's votes
    const userVotes = this.userVotes.get(userId) || []
    const index = userVotes.indexOf(voteId)
    if (index > -1)
      userVotes.splice(index, 1)

    // Update target's vote count
    this.updateVoteCount(targetId, targetType, vote.voteType, -1)

    this.emit('voteRemoved', { targetId, targetType, userId })
    return true
  }

  private updateVoteCount(targetId: string, targetType: 'question' | 'answer' | 'comment', voteType: 'upvote' | 'downvote', delta: number): void {
    if (targetType === 'question') {
      const question = this.questions.get(targetId)
      if (question) {
        if (voteType === 'upvote')
          question.upvotes += delta
        else
          question.downvotes += delta

        this.questions.set(targetId, question)
      }
    }
    else if (targetType === 'answer') {
      const answer = this.answers.get(targetId)
      if (answer) {
        if (voteType === 'upvote')
          answer.upvotes += delta
        else
          answer.downvotes += delta

        this.answers.set(targetId, answer)
      }
    }
    else if (targetType === 'comment') {
      const comment = this.comments.get(targetId)
      if (comment) {
        if (voteType === 'upvote')
          comment.upvotes += delta
        else
          comment.downvotes += delta

        this.comments.set(targetId, comment)
      }
    }
  }

  // Topic Management
  public createTopic(topicData: Omit<Topic, 'followers' | 'questions' | 'createdAt'>): Topic {
    const topic: Topic = {
      ...topicData,
      followers: 0,
      questions: 0,
      createdAt: new Date(),
    }

    this.topics.set(topic.id, topic)
    this.topicQuestions.set(topic.id, [])
    this.topicFollowers.set(topic.id, [])

    this.emit('topicCreated', topic)
    return topic
  }

  public getTopic(topicId: string): Topic | undefined {
    return this.topics.get(topicId)
  }

  public findTopicByName(name: string): Topic | undefined {
    for (const topic of this.topics.values()) {
      if (topic.name.toLowerCase() === name.toLowerCase())
        return topic
    }
    return undefined
  }

  // Follow Management
  public followUser(followerId: string, followingId: string): Follow | null {
    if (followerId === followingId)
      return null // Can't follow yourself
    if (!this.users.has(followerId) || !this.users.has(followingId))
      return null

    const followId = `${followerId}-${followingId}`
    if (this.follows.has(followId))
      return null // Already following

    const follow: Follow = {
      id: followId,
      followerId,
      followingId,
      createdAt: new Date(),
    }

    this.follows.set(followId, follow)
    this.userFollowing.get(followerId)?.push(followingId)
    this.userFollowers.get(followingId)?.push(followerId)

    this.emit('userFollowed', { followerId, followingId })
    return follow
  }

  public unfollowUser(followerId: string, followingId: string): boolean {
    const followId = `${followerId}-${followingId}`
    if (!this.follows.has(followId))
      return false

    this.follows.delete(followId)

    // Remove from following/followers lists
    const following = this.userFollowing.get(followerId) || []
    const followingIndex = following.indexOf(followingId)
    if (followingIndex > -1)
      following.splice(followingIndex, 1)

    const followers = this.userFollowers.get(followingId) || []
    const followersIndex = followers.indexOf(followerId)
    if (followersIndex > -1)
      followers.splice(followersIndex, 1)

    this.emit('userUnfollowed', { followerId, followingId })
    return true
  }

  public followTopic(userId: string, topicId: string): TopicFollow | null {
    if (!this.users.has(userId) || !this.topics.has(topicId))
      return null

    const followId = `${userId}-${topicId}`
    if (this.topicFollows.has(followId))
      return null // Already following

    const topicFollow: TopicFollow = {
      id: followId,
      userId,
      topicId,
      createdAt: new Date(),
    }

    this.topicFollows.set(followId, topicFollow)
    this.topicFollowers.get(topicId)?.push(userId)

    // Update topic follower count
    const topic = this.topics.get(topicId)
    if (topic) {
      topic.followers++
      this.topics.set(topicId, topic)
    }

    this.emit('topicFollowed', { userId, topicId })
    return topicFollow
  }

  public unfollowTopic(userId: string, topicId: string): boolean {
    const followId = `${userId}-${topicId}`
    if (!this.topicFollows.has(followId))
      return false

    this.topicFollows.delete(followId)

    // Remove from topic followers
    const topicFollowers = this.topicFollowers.get(topicId) || []
    const index = topicFollowers.indexOf(userId)
    if (index > -1)
      topicFollowers.splice(index, 1)

    // Update topic follower count
    const topic = this.topics.get(topicId)
    if (topic) {
      topic.followers--
      this.topics.set(topicId, topic)
    }

    this.emit('topicUnfollowed', { userId, topicId })
    return true
  }

  // Search and Discovery
  public searchQuestions(query: string, topicId?: string): Question[] {
    let questions = Array.from(this.questions.values())

    if (topicId) {
      const topicQuestions = this.topicQuestions.get(topicId) || []
      questions = questions.filter(q => topicQuestions.includes(q.id))
    }

    return questions.filter(question =>
      question.title.toLowerCase().includes(query.toLowerCase())
      || question.content.toLowerCase().includes(query.toLowerCase())
      || question.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase())),
    )
  }

  public searchUsers(query: string): User[] {
    const allUsers = Array.from(this.users.values())
    return allUsers.filter(user =>
      user.username.toLowerCase().includes(query.toLowerCase())
      || user.displayName.toLowerCase().includes(query.toLowerCase())
      || user.bio?.toLowerCase().includes(query.toLowerCase())
      || user.credentials.some(cred => cred.toLowerCase().includes(query.toLowerCase())),
    )
  }

  public getQuestionAnswers(questionId: string): Answer[] {
    const answerIds = this.questionAnswers.get(questionId) || []
    return answerIds.map(id => this.answers.get(id)).filter(Boolean) as Answer[]
  }

  public getQuestionComments(questionId: string): Comment[] {
    const commentIds = this.questionComments.get(questionId) || []
    return commentIds.map(id => this.comments.get(id)).filter(Boolean) as Comment[]
  }

  public getAnswerComments(answerId: string): Comment[] {
    const commentIds = this.answerComments.get(answerId) || []
    return commentIds.map(id => this.comments.get(id)).filter(Boolean) as Comment[]
  }

  public getUserQuestions(userId: string): Question[] {
    const questionIds = this.userQuestions.get(userId) || []
    return questionIds.map(id => this.questions.get(id)).filter(Boolean) as Question[]
  }

  public getUserAnswers(userId: string): Answer[] {
    const answerIds = this.userAnswers.get(userId) || []
    return answerIds.map(id => this.answers.get(id)).filter(Boolean) as Answer[]
  }

  public getTopicQuestions(topicId: string): Question[] {
    const questionIds = this.topicQuestions.get(topicId) || []
    return questionIds.map(id => this.questions.get(id)).filter(Boolean) as Question[]
  }

  // Statistics
  public getStatistics(): {
    totalUsers: number
    totalQuestions: number
    totalAnswers: number
    totalComments: number
    totalVotes: number
    totalTopics: number
    totalFollows: number
    totalTopicFollows: number
    averageQuestionsPerUser: number
    averageAnswersPerQuestion: number
    averageCommentsPerQuestion: number
  } {
    const totalUsers = this.users.size
    const totalQuestions = this.questions.size
    const totalAnswers = this.answers.size
    const totalComments = this.comments.size
    const totalVotes = this.votes.size
    const totalTopics = this.topics.size
    const totalFollows = this.follows.size
    const totalTopicFollows = this.topicFollows.size

    return {
      totalUsers,
      totalQuestions,
      totalAnswers,
      totalComments,
      totalVotes,
      totalTopics,
      totalFollows,
      totalTopicFollows,
      averageQuestionsPerUser: totalUsers > 0 ? totalQuestions / totalUsers : 0,
      averageAnswersPerQuestion: totalQuestions > 0 ? totalAnswers / totalQuestions : 0,
      averageCommentsPerQuestion: totalQuestions > 0 ? totalComments / totalQuestions : 0,
    }
  }

  // Reputation System
  public updateReputation(userId: string, points: number): boolean {
    const user = this.users.get(userId)
    if (!user)
      return false

    user.reputation += points
    user.updatedAt = new Date()
    this.users.set(userId, user)

    this.emit('reputationUpdated', { userId, newReputation: user.reputation, points })
    return true
  }

  public getTopUsers(limit: number = 10): User[] {
    const allUsers = Array.from(this.users.values())
    return allUsers
      .sort((a, b) => b.reputation - a.reputation)
      .slice(0, limit)
  }

  public getTopQuestions(limit: number = 10): Question[] {
    const allQuestions = Array.from(this.questions.values())
    return allQuestions
      .sort((a, b) => (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes))
      .slice(0, limit)
  }
}
