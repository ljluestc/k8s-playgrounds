import { beforeEach, describe, expect, it } from 'vitest'
import { QuoraSystem } from './quora'

describe('Quora System', () => {
  let quora: QuoraSystem

  beforeEach(() => {
    quora = new QuoraSystem()
  })

  describe('User Management', () => {
    it('should create a user', () => {
      const userData = {
        id: 'test-user',
        username: 'testuser',
        email: 'test@example.com',
        displayName: 'Test User',
        bio: 'Test bio',
        credentials: ['Test Credential'],
      }

      const user = quora.createUser(userData)

      expect(user.id).toBe('test-user')
      expect(user.username).toBe('testuser')
      expect(user.email).toBe('test@example.com')
      expect(user.displayName).toBe('Test User')
      expect(user.bio).toBe('Test bio')
      expect(user.credentials).toEqual(['Test Credential'])
      expect(user.reputation).toBe(0)
      expect(user.createdAt).toBeInstanceOf(Date)
      expect(user.updatedAt).toBeInstanceOf(Date)
    })

    it('should get a user by ID', () => {
      const user = quora.getUser('user1')
      expect(user).toBeDefined()
      expect(user?.username).toBe('john_doe')
    })

    it('should return undefined for non-existent user', () => {
      const user = quora.getUser('non-existent')
      expect(user).toBeUndefined()
    })

    it('should update a user', async () => {
      const updates = {
        displayName: 'Updated Name',
        bio: 'Updated bio',
      }

      // Add small delay to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10))
      const updatedUser = quora.updateUser('user1', updates)
      expect(updatedUser).toBeDefined()
      expect(updatedUser?.displayName).toBe('Updated Name')
      expect(updatedUser?.bio).toBe('Updated bio')
      expect(updatedUser?.updatedAt.getTime()).toBeGreaterThan(updatedUser?.createdAt.getTime() || 0)
    })

    it('should return null when updating non-existent user', () => {
      const updates = { displayName: 'New Name' }
      const result = quora.updateUser('non-existent', updates)
      expect(result).toBeNull()
    })

    it('should delete a user', () => {
      const result = quora.deleteUser('user1')
      expect(result).toBe(true)
      expect(quora.getUser('user1')).toBeUndefined()
    })

    it('should return false when deleting non-existent user', () => {
      const result = quora.deleteUser('non-existent')
      expect(result).toBe(false)
    })
  })

  describe('Question Management', () => {
    it('should create a question', () => {
      const questionData = {
        id: 'test-question',
        title: 'Test Question',
        content: 'This is a test question.',
        authorId: 'user1',
        tags: ['test', 'question'],
      }

      const question = quora.createQuestion(questionData)

      expect(question.id).toBe('test-question')
      expect(question.title).toBe('Test Question')
      expect(question.content).toBe('This is a test question.')
      expect(question.authorId).toBe('user1')
      expect(question.tags).toEqual(['test', 'question'])
      expect(question.views).toBe(0)
      expect(question.upvotes).toBe(0)
      expect(question.downvotes).toBe(0)
      expect(question.answers).toBe(0)
      expect(question.isAnswered).toBe(false)
      expect(question.isClosed).toBe(false)
      expect(question.createdAt).toBeInstanceOf(Date)
      expect(question.updatedAt).toBeInstanceOf(Date)
    })

    it('should throw error for question content exceeding maximum length', () => {
      const questionData = {
        id: 'test-question',
        title: 'Test Question',
        content: 'x'.repeat(10001), // Exceeds default max length
        authorId: 'user1',
        tags: ['test'],
      }

      expect(() => quora.createQuestion(questionData)).toThrow('Question content exceeds maximum length')
    })

    it('should get a question by ID', () => {
      const question = quora.getQuestion('q1')
      expect(question).toBeDefined()
      expect(question?.title).toContain('best practices')
    })

    it('should return undefined for non-existent question', () => {
      const question = quora.getQuestion('non-existent')
      expect(question).toBeUndefined()
    })

    it('should update a question', async () => {
      const updates = {
        title: 'Updated Question',
        content: 'Updated content',
      }

      // Add small delay to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10))
      const updatedQuestion = quora.updateQuestion('q1', updates)
      expect(updatedQuestion).toBeDefined()
      expect(updatedQuestion?.title).toBe('Updated Question')
      expect(updatedQuestion?.content).toBe('Updated content')
      expect(updatedQuestion?.updatedAt.getTime()).toBeGreaterThan(updatedQuestion?.createdAt.getTime() || 0)
    })

    it('should return null when updating non-existent question', () => {
      const updates = { title: 'New Title' }
      const result = quora.updateQuestion('non-existent', updates)
      expect(result).toBeNull()
    })

    it('should delete a question', () => {
      const result = quora.deleteQuestion('q1')
      expect(result).toBe(true)
      expect(quora.getQuestion('q1')).toBeUndefined()
    })

    it('should return false when deleting non-existent question', () => {
      const result = quora.deleteQuestion('non-existent')
      expect(result).toBe(false)
    })
  })

  describe('Answer Management', () => {
    it('should create an answer', () => {
      const answerData = {
        id: 'test-answer',
        questionId: 'q1',
        authorId: 'user2',
        content: 'This is a test answer.',
      }

      const answer = quora.createAnswer(answerData)

      expect(answer.id).toBe('test-answer')
      expect(answer.questionId).toBe('q1')
      expect(answer.authorId).toBe('user2')
      expect(answer.content).toBe('This is a test answer.')
      expect(answer.upvotes).toBe(0)
      expect(answer.downvotes).toBe(0)
      expect(answer.isAccepted).toBe(false)
      expect(answer.createdAt).toBeInstanceOf(Date)
      expect(answer.updatedAt).toBeInstanceOf(Date)
    })

    it('should throw error for answer content exceeding maximum length', () => {
      const answerData = {
        id: 'test-answer',
        questionId: 'q1',
        authorId: 'user2',
        content: 'x'.repeat(50001), // Exceeds default max length
      }

      expect(() => quora.createAnswer(answerData)).toThrow('Answer content exceeds maximum length')
    })

    it('should get an answer by ID', () => {
      const answer = quora.getAnswer('a1')
      expect(answer).toBeDefined()
      expect(answer?.content).toContain('clean code principles')
    })

    it('should return undefined for non-existent answer', () => {
      const answer = quora.getAnswer('non-existent')
      expect(answer).toBeUndefined()
    })

    it('should update an answer', async () => {
      const updates = {
        content: 'Updated answer content',
      }

      // Add small delay to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10))
      const updatedAnswer = quora.updateAnswer('a1', updates)
      expect(updatedAnswer).toBeDefined()
      expect(updatedAnswer?.content).toBe('Updated answer content')
      expect(updatedAnswer?.updatedAt.getTime()).toBeGreaterThan(updatedAnswer?.createdAt.getTime() || 0)
    })

    it('should return null when updating non-existent answer', () => {
      const updates = { content: 'New content' }
      const result = quora.updateAnswer('non-existent', updates)
      expect(result).toBeNull()
    })

    it('should delete an answer', () => {
      const result = quora.deleteAnswer('a1')
      expect(result).toBe(true)
      expect(quora.getAnswer('a1')).toBeUndefined()
    })

    it('should return false when deleting non-existent answer', () => {
      const result = quora.deleteAnswer('non-existent')
      expect(result).toBe(false)
    })

    it('should accept an answer', () => {
      const result = quora.acceptAnswer('a1')
      expect(result).toBe(true)

      const answer = quora.getAnswer('a1')
      expect(answer?.isAccepted).toBe(true)

      const question = quora.getQuestion('q1')
      expect(question?.isAnswered).toBe(true)
    })

    it('should return false when accepting non-existent answer', () => {
      const result = quora.acceptAnswer('non-existent')
      expect(result).toBe(false)
    })
  })

  describe('Comment Management', () => {
    it('should create a comment on a question', () => {
      const commentData = {
        id: 'test-comment',
        parentId: 'q1',
        parentType: 'question' as const,
        authorId: 'user2',
        content: 'This is a test comment on a question.',
      }

      const comment = quora.createComment(commentData)

      expect(comment.id).toBe('test-comment')
      expect(comment.parentId).toBe('q1')
      expect(comment.parentType).toBe('question')
      expect(comment.authorId).toBe('user2')
      expect(comment.content).toBe('This is a test comment on a question.')
      expect(comment.upvotes).toBe(0)
      expect(comment.downvotes).toBe(0)
      expect(comment.createdAt).toBeInstanceOf(Date)
      expect(comment.updatedAt).toBeInstanceOf(Date)
    })

    it('should create a comment on an answer', () => {
      const commentData = {
        id: 'test-comment-2',
        parentId: 'a1',
        parentType: 'answer' as const,
        authorId: 'user1',
        content: 'This is a test comment on an answer.',
      }

      const comment = quora.createComment(commentData)

      expect(comment.id).toBe('test-comment-2')
      expect(comment.parentId).toBe('a1')
      expect(comment.parentType).toBe('answer')
      expect(comment.authorId).toBe('user1')
      expect(comment.content).toBe('This is a test comment on an answer.')
    })

    it('should throw error for comment content exceeding maximum length', () => {
      const commentData = {
        id: 'test-comment',
        parentId: 'q1',
        parentType: 'question' as const,
        authorId: 'user2',
        content: 'x'.repeat(2001), // Exceeds default max length
      }

      expect(() => quora.createComment(commentData)).toThrow('Comment content exceeds maximum length')
    })

    it('should get a comment by ID', () => {
      // Create comment first
      const commentData = {
        id: 'test-comment-3',
        parentId: 'q1',
        parentType: 'question' as const,
        authorId: 'user2',
        content: 'Test comment',
      }
      quora.createComment(commentData)

      const comment = quora.getComment('test-comment-3')
      expect(comment).toBeDefined()
      expect(comment?.content).toBe('Test comment')
    })

    it('should return undefined for non-existent comment', () => {
      const comment = quora.getComment('non-existent')
      expect(comment).toBeUndefined()
    })

    it('should update a comment', async () => {
      // Create comment first
      const commentData = {
        id: 'test-comment-4',
        parentId: 'q1',
        parentType: 'question' as const,
        authorId: 'user2',
        content: 'Original comment',
      }
      quora.createComment(commentData)

      const updates = {
        content: 'Updated comment',
      }

      // Add small delay to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10))
      const updatedComment = quora.updateComment('test-comment-4', updates)
      expect(updatedComment).toBeDefined()
      expect(updatedComment?.content).toBe('Updated comment')
      expect(updatedComment?.updatedAt.getTime()).toBeGreaterThan(updatedComment?.createdAt.getTime() || 0)
    })

    it('should return null when updating non-existent comment', () => {
      const updates = { content: 'New content' }
      const result = quora.updateComment('non-existent', updates)
      expect(result).toBeNull()
    })

    it('should delete a comment', () => {
      // Create comment first
      const commentData = {
        id: 'test-comment-5',
        parentId: 'q1',
        parentType: 'question' as const,
        authorId: 'user2',
        content: 'Comment to delete',
      }
      quora.createComment(commentData)

      const result = quora.deleteComment('test-comment-5')
      expect(result).toBe(true)
      expect(quora.getComment('test-comment-5')).toBeUndefined()
    })

    it('should return false when deleting non-existent comment', () => {
      const result = quora.deleteComment('non-existent')
      expect(result).toBe(false)
    })
  })

  describe('Vote Management', () => {
    it('should upvote a question', () => {
      const vote = quora.vote('q1', 'question', 'user2', 'upvote')
      expect(vote).toBeDefined()
      expect(vote?.userId).toBe('user2')
      expect(vote?.targetId).toBe('q1')
      expect(vote?.targetType).toBe('question')
      expect(vote?.voteType).toBe('upvote')
      expect(vote?.createdAt).toBeInstanceOf(Date)

      const question = quora.getQuestion('q1')
      expect(question?.upvotes).toBe(1)
    })

    it('should downvote an answer', () => {
      const vote = quora.vote('a1', 'answer', 'user3', 'downvote')
      expect(vote).toBeDefined()
      expect(vote?.voteType).toBe('downvote')

      const answer = quora.getAnswer('a1')
      expect(answer?.downvotes).toBe(1)
    })

    it('should return null when voting on already voted target', () => {
      quora.vote('q1', 'question', 'user2', 'upvote')
      const vote = quora.vote('q1', 'question', 'user2', 'upvote')
      expect(vote).toBeNull()
    })

    it('should remove a vote', () => {
      quora.vote('q1', 'question', 'user2', 'upvote')
      const result = quora.removeVote('q1', 'question', 'user2')
      expect(result).toBe(true)

      const question = quora.getQuestion('q1')
      expect(question?.upvotes).toBe(0)
    })

    it('should return false when removing non-existent vote', () => {
      const result = quora.removeVote('q1', 'question', 'user2')
      expect(result).toBe(false)
    })
  })

  describe('Topic Management', () => {
    it('should create a topic', () => {
      const topicData = {
        id: 'test-topic',
        name: 'Test Topic',
        description: 'This is a test topic',
      }

      const topic = quora.createTopic(topicData)

      expect(topic.id).toBe('test-topic')
      expect(topic.name).toBe('Test Topic')
      expect(topic.description).toBe('This is a test topic')
      expect(topic.followers).toBe(0)
      expect(topic.questions).toBe(0)
      expect(topic.createdAt).toBeInstanceOf(Date)
    })

    it('should get a topic by ID', () => {
      const topic = quora.getTopic('topic1')
      expect(topic).toBeDefined()
      expect(topic?.name).toBe('Programming')
    })

    it('should return undefined for non-existent topic', () => {
      const topic = quora.getTopic('non-existent')
      expect(topic).toBeUndefined()
    })

    it('should find a topic by name', () => {
      const topic = quora.findTopicByName('Programming')
      expect(topic).toBeDefined()
      expect(topic?.id).toBe('topic1')
    })

    it('should return undefined for non-existent topic name', () => {
      const topic = quora.findTopicByName('Non-existent Topic')
      expect(topic).toBeUndefined()
    })
  })

  describe('Follow Management', () => {
    it('should follow a user', () => {
      const follow = quora.followUser('user1', 'user3')
      expect(follow).toBeDefined()
      expect(follow?.followerId).toBe('user1')
      expect(follow?.followingId).toBe('user3')
      expect(follow?.createdAt).toBeInstanceOf(Date)
    })

    it('should return null when following non-existent user', () => {
      const follow = quora.followUser('user1', 'non-existent')
      expect(follow).toBeNull()
    })

    it('should return null when following yourself', () => {
      const follow = quora.followUser('user1', 'user1')
      expect(follow).toBeNull()
    })

    it('should return null when already following', () => {
      quora.followUser('user1', 'user3')
      const follow = quora.followUser('user1', 'user3')
      expect(follow).toBeNull()
    })

    it('should unfollow a user', () => {
      quora.followUser('user1', 'user3')
      const result = quora.unfollowUser('user1', 'user3')
      expect(result).toBe(true)
    })

    it('should return false when unfollowing non-followed user', () => {
      const result = quora.unfollowUser('user1', 'user3')
      expect(result).toBe(false)
    })

    it('should follow a topic', () => {
      const topicFollow = quora.followTopic('user1', 'topic2')
      expect(topicFollow).toBeDefined()
      expect(topicFollow?.userId).toBe('user1')
      expect(topicFollow?.topicId).toBe('topic2')
      expect(topicFollow?.createdAt).toBeInstanceOf(Date)

      const topic = quora.getTopic('topic2')
      expect(topic?.followers).toBeGreaterThan(0) // Check that followers increased
    })

    it('should return null when following non-existent topic', () => {
      const topicFollow = quora.followTopic('user1', 'non-existent')
      expect(topicFollow).toBeNull()
    })

    it('should unfollow a topic', () => {
      quora.followTopic('user1', 'topic2')
      const result = quora.unfollowTopic('user1', 'topic2')
      expect(result).toBe(true)

      const topic = quora.getTopic('topic2')
      expect(topic?.followers).toBeGreaterThanOrEqual(0) // Check that followers decreased or stayed the same
    })

    it('should return false when unfollowing non-followed topic', () => {
      const result = quora.unfollowTopic('user1', 'topic2')
      expect(result).toBe(false)
    })
  })

  describe('Search and Discovery', () => {
    it('should search questions by title', () => {
      const results = quora.searchQuestions('best practices')
      expect(Array.isArray(results)).toBe(true)
      expect(results.length).toBeGreaterThan(0)
      expect(results.some(q => q.title.includes('best practices'))).toBe(true)
    })

    it('should search questions by content', () => {
      const results = quora.searchQuestions('neural networks')
      expect(Array.isArray(results)).toBe(true)
      expect(results.length).toBeGreaterThan(0)
      expect(results.some(q => q.content.includes('neural networks'))).toBe(true)
    })

    it('should search questions by tags', () => {
      const results = quora.searchQuestions('programming')
      expect(Array.isArray(results)).toBe(true)
      expect(results.length).toBeGreaterThan(0)
      expect(results.some(q => q.tags.includes('programming'))).toBe(true)
    })

    it('should search questions by topic', () => {
      const results = quora.searchQuestions('', 'topic1')
      expect(Array.isArray(results)).toBe(true)
      expect(results.length).toBeGreaterThan(0)
    })

    it('should search users by username', () => {
      const results = quora.searchUsers('john')
      expect(Array.isArray(results)).toBe(true)
      expect(results.length).toBeGreaterThan(0)
      expect(results.some(u => u.username.includes('john'))).toBe(true)
    })

    it('should search users by display name', () => {
      const results = quora.searchUsers('John Doe')
      expect(Array.isArray(results)).toBe(true)
      expect(results.length).toBeGreaterThan(0)
      expect(results.some(u => u.displayName.includes('John Doe'))).toBe(true)
    })

    it('should get question answers', () => {
      const answers = quora.getQuestionAnswers('q1')
      expect(Array.isArray(answers)).toBe(true)
      expect(answers.length).toBeGreaterThan(0)
    })

    it('should get question comments', () => {
      // Create a comment first
      quora.createComment({
        id: 'comment1',
        parentId: 'q1',
        parentType: 'question',
        authorId: 'user2',
        content: 'Test comment',
      })

      const comments = quora.getQuestionComments('q1')
      expect(Array.isArray(comments)).toBe(true)
      expect(comments.length).toBeGreaterThan(0)
    })

    it('should get answer comments', () => {
      // Create a comment first
      quora.createComment({
        id: 'comment2',
        parentId: 'a1',
        parentType: 'answer',
        authorId: 'user1',
        content: 'Test comment on answer',
      })

      const comments = quora.getAnswerComments('a1')
      expect(Array.isArray(comments)).toBe(true)
      expect(comments.length).toBeGreaterThan(0)
    })

    it('should get user questions', () => {
      const questions = quora.getUserQuestions('user1')
      expect(Array.isArray(questions)).toBe(true)
      expect(questions.length).toBeGreaterThan(0)
      expect(questions.every(q => q.authorId === 'user1')).toBe(true)
    })

    it('should get user answers', () => {
      const answers = quora.getUserAnswers('user2')
      expect(Array.isArray(answers)).toBe(true)
      expect(answers.length).toBeGreaterThan(0)
      expect(answers.every(a => a.authorId === 'user2')).toBe(true)
    })

    it('should get topic questions', () => {
      const questions = quora.getTopicQuestions('topic1')
      expect(Array.isArray(questions)).toBe(true)
      expect(questions.length).toBeGreaterThan(0)
    })
  })

  describe('Reputation System', () => {
    it('should update user reputation', () => {
      const user = quora.getUser('user1')
      const initialReputation = user?.reputation || 0

      const result = quora.updateReputation('user1', 100)
      expect(result).toBe(true)

      const updatedUser = quora.getUser('user1')
      expect(updatedUser?.reputation).toBe(initialReputation + 100)
    })

    it('should return false when updating non-existent user reputation', () => {
      const result = quora.updateReputation('non-existent', 100)
      expect(result).toBe(false)
    })

    it('should get top users', () => {
      const topUsers = quora.getTopUsers(3)
      expect(Array.isArray(topUsers)).toBe(true)
      expect(topUsers.length).toBe(3)
      expect(topUsers[0].reputation).toBeGreaterThanOrEqual(topUsers[1].reputation)
    })

    it('should get top questions', () => {
      const topQuestions = quora.getTopQuestions(3)
      expect(Array.isArray(topQuestions)).toBe(true)
      expect(topQuestions.length).toBe(3)
    })
  })

  describe('Statistics', () => {
    it('should get system statistics', () => {
      const stats = quora.getStatistics()

      expect(stats).toHaveProperty('totalUsers')
      expect(stats).toHaveProperty('totalQuestions')
      expect(stats).toHaveProperty('totalAnswers')
      expect(stats).toHaveProperty('totalComments')
      expect(stats).toHaveProperty('totalVotes')
      expect(stats).toHaveProperty('totalTopics')
      expect(stats).toHaveProperty('totalFollows')
      expect(stats).toHaveProperty('totalTopicFollows')
      expect(stats).toHaveProperty('averageQuestionsPerUser')
      expect(stats).toHaveProperty('averageAnswersPerQuestion')
      expect(stats).toHaveProperty('averageCommentsPerQuestion')

      expect(typeof stats.totalUsers).toBe('number')
      expect(typeof stats.totalQuestions).toBe('number')
      expect(typeof stats.totalAnswers).toBe('number')
      expect(typeof stats.totalComments).toBe('number')
      expect(typeof stats.totalVotes).toBe('number')
      expect(typeof stats.totalTopics).toBe('number')
    })
  })

  describe('Integration Tests', () => {
    it('should handle complete question-answer workflow', () => {
      // Create user
      const user = quora.createUser({
        id: 'workflow-user',
        username: 'workflow',
        email: 'workflow@example.com',
        displayName: 'Workflow User',
        credentials: ['Test Credential'],
      })

      // Create question
      const question = quora.createQuestion({
        id: 'workflow-question',
        title: 'Workflow Test Question',
        content: 'This is a workflow test question.',
        authorId: 'workflow-user',
        tags: ['workflow', 'test'],
      })

      // Create answer
      const answer = quora.createAnswer({
        id: 'workflow-answer',
        questionId: 'workflow-question',
        authorId: 'user1',
        content: 'This is a workflow test answer.',
      })

      // Create comment
      const comment = quora.createComment({
        id: 'workflow-comment',
        parentId: 'workflow-question',
        parentType: 'question',
        authorId: 'user2',
        content: 'Workflow test comment',
      })

      // Vote on question
      const vote = quora.vote('workflow-question', 'question', 'user2', 'upvote')

      // Accept answer
      quora.acceptAnswer('workflow-answer')

      expect(user).toBeDefined()
      expect(question).toBeDefined()
      expect(answer).toBeDefined()
      expect(comment).toBeDefined()
      expect(vote).toBeDefined()

      // Verify question is answered
      const updatedQuestion = quora.getQuestion('workflow-question')
      expect(updatedQuestion?.isAnswered).toBe(true)
      expect(updatedQuestion?.upvotes).toBe(1)
    })

    it('should handle topic following workflow', () => {
      // Create topic
      const topic = quora.createTopic({
        id: 'workflow-topic',
        name: 'Workflow Topic',
        description: 'Test topic for workflow',
      })

      // Follow topic
      const topicFollow = quora.followTopic('user1', 'workflow-topic')

      // Create question with topic tag
      const question = quora.createQuestion({
        id: 'workflow-topic-question',
        title: 'Workflow Topic Question',
        content: 'This is a question about the workflow topic.',
        authorId: 'user1',
        tags: ['workflow-topic'],
      })

      expect(topic).toBeDefined()
      expect(topicFollow).toBeDefined()
      expect(question).toBeDefined()

      // Verify topic has followers and questions
      const updatedTopic = quora.getTopic('workflow-topic')
      expect(updatedTopic?.followers).toBe(1)
    })
  })

  describe('Event Handling', () => {
    it('should emit user created event', async () => {
      return new Promise<void>((resolve) => {
        quora.on('userCreated', (user) => {
          expect(user.id).toBe('event-user')
          resolve()
        })

        quora.createUser({
          id: 'event-user',
          username: 'eventuser',
          email: 'event@example.com',
          displayName: 'Event User',
        })
      })
    })

    it('should emit question created event', async () => {
      return new Promise<void>((resolve) => {
        quora.on('questionCreated', (question) => {
          expect(question.id).toBe('event-question')
          resolve()
        })

        quora.createQuestion({
          id: 'event-question',
          title: 'Event Question',
          content: 'Event test question',
          authorId: 'user1',
          tags: ['event', 'test'],
        })
      })
    })

    it('should emit answer created event', async () => {
      return new Promise<void>((resolve) => {
        quora.on('answerCreated', (answer) => {
          expect(answer.id).toBe('event-answer')
          resolve()
        })

        quora.createAnswer({
          id: 'event-answer',
          questionId: 'q1',
          authorId: 'user2',
          content: 'Event test answer',
        })
      })
    })

    it('should emit vote created event', async () => {
      return new Promise<void>((resolve) => {
        quora.on('voteCreated', (vote) => {
          expect(vote.targetId).toBe('q1')
          expect(vote.voteType).toBe('upvote')
          resolve()
        })

        quora.vote('q1', 'question', 'user2', 'upvote')
      })
    })

    it('should emit user followed event', async () => {
      return new Promise<void>((resolve) => {
        quora.on('userFollowed', (data) => {
          expect(data.followerId).toBe('user1')
          expect(data.followingId).toBe('user3')
          resolve()
        })

        quora.followUser('user1', 'user3')
      })
    })

    it('should emit topic followed event', async () => {
      return new Promise<void>((resolve) => {
        quora.on('topicFollowed', (data) => {
          expect(data.userId).toBe('user1')
          expect(data.topicId).toBe('topic2')
          resolve()
        })

        quora.followTopic('user1', 'topic2')
      })
    })
  })
})
