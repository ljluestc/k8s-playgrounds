import { beforeEach, describe, expect, it } from 'vitest'
import { NewsfeedSystem } from './newsfeed'

describe('Newsfeed System', () => {
  let newsfeed: NewsfeedSystem

  beforeEach(() => {
    newsfeed = new NewsfeedSystem()
  })

  describe('User Management', () => {
    it('should create a user', () => {
      const userData = {
        id: 'test-user',
        username: 'testuser',
        email: 'test@example.com',
        displayName: 'Test User',
        bio: 'Test bio',
      }

      const user = newsfeed.createUser(userData)

      expect(user.id).toBe('test-user')
      expect(user.username).toBe('testuser')
      expect(user.email).toBe('test@example.com')
      expect(user.displayName).toBe('Test User')
      expect(user.bio).toBe('Test bio')
      expect(user.createdAt).toBeInstanceOf(Date)
      expect(user.updatedAt).toBeInstanceOf(Date)
    })

    it('should get a user by ID', () => {
      const user = newsfeed.getUser('user1')
      expect(user).toBeDefined()
      expect(user?.username).toBe('john_doe')
    })

    it('should return undefined for non-existent user', () => {
      const user = newsfeed.getUser('non-existent')
      expect(user).toBeUndefined()
    })

    it('should update a user', async () => {
      const updates = {
        displayName: 'Updated Name',
        bio: 'Updated bio',
      }

      // Add a small delay to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10))

      const updatedUser = newsfeed.updateUser('user1', updates)
      expect(updatedUser).toBeDefined()
      expect(updatedUser?.displayName).toBe('Updated Name')
      expect(updatedUser?.bio).toBe('Updated bio')
      expect(updatedUser?.updatedAt.getTime()).toBeGreaterThan(updatedUser?.createdAt.getTime() || 0)
    })

    it('should return null when updating non-existent user', () => {
      const updates = { displayName: 'New Name' }
      const result = newsfeed.updateUser('non-existent', updates)
      expect(result).toBeNull()
    })

    it('should delete a user', () => {
      const result = newsfeed.deleteUser('user1')
      expect(result).toBe(true)
      expect(newsfeed.getUser('user1')).toBeUndefined()
    })

    it('should return false when deleting non-existent user', () => {
      const result = newsfeed.deleteUser('non-existent')
      expect(result).toBe(false)
    })
  })

  describe('Post Management', () => {
    it('should create a post', () => {
      const postData = {
        id: 'test-post',
        authorId: 'user1',
        content: 'Test post content',
        tags: ['test', 'example'],
        isPublic: true,
      }

      const post = newsfeed.createPost(postData)

      expect(post.id).toBe('test-post')
      expect(post.authorId).toBe('user1')
      expect(post.content).toBe('Test post content')
      expect(post.tags).toEqual(['test', 'example'])
      expect(post.isPublic).toBe(true)
      expect(post.likes).toBe(0)
      expect(post.comments).toBe(0)
      expect(post.shares).toBe(0)
      expect(post.createdAt).toBeInstanceOf(Date)
      expect(post.updatedAt).toBeInstanceOf(Date)
    })

    it('should get a post by ID', () => {
      const post = newsfeed.getPost('post1')
      expect(post).toBeDefined()
      expect(post?.content).toContain('amazing new feature')
    })

    it('should return undefined for non-existent post', () => {
      const post = newsfeed.getPost('non-existent')
      expect(post).toBeUndefined()
    })

    it('should update a post', async () => {
      const updates = {
        content: 'Updated content',
        tags: ['updated', 'test'],
      }

      // Add a small delay to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10))

      const updatedPost = newsfeed.updatePost('post1', updates)
      expect(updatedPost).toBeDefined()
      expect(updatedPost?.content).toBe('Updated content')
      expect(updatedPost?.tags).toEqual(['updated', 'test'])
      expect(updatedPost?.updatedAt.getTime()).toBeGreaterThan(updatedPost?.createdAt.getTime() || 0)
    })

    it('should return null when updating non-existent post', () => {
      const updates = { content: 'New content' }
      const result = newsfeed.updatePost('non-existent', updates)
      expect(result).toBeNull()
    })

    it('should delete a post', () => {
      const result = newsfeed.deletePost('post1')
      expect(result).toBe(true)
      expect(newsfeed.getPost('post1')).toBeUndefined()
    })

    it('should return false when deleting non-existent post', () => {
      const result = newsfeed.deletePost('non-existent')
      expect(result).toBe(false)
    })
  })

  describe('Comment Management', () => {
    it('should create a comment', () => {
      const commentData = {
        id: 'test-comment',
        postId: 'post1',
        authorId: 'user2',
        content: 'Great post!',
      }

      const comment = newsfeed.createComment(commentData)

      expect(comment.id).toBe('test-comment')
      expect(comment.postId).toBe('post1')
      expect(comment.authorId).toBe('user2')
      expect(comment.content).toBe('Great post!')
      expect(comment.likes).toBe(0)
      expect(comment.createdAt).toBeInstanceOf(Date)
      expect(comment.updatedAt).toBeInstanceOf(Date)
    })

    it('should get a comment by ID', () => {
      // Create comment first
      const commentData = {
        id: 'test-comment-2',
        postId: 'post1',
        authorId: 'user2',
        content: 'Great post!',
      }
      newsfeed.createComment(commentData)

      const comment = newsfeed.getComment('test-comment-2')
      expect(comment).toBeDefined()
      expect(comment?.content).toBe('Great post!')
    })

    it('should return undefined for non-existent comment', () => {
      const comment = newsfeed.getComment('non-existent')
      expect(comment).toBeUndefined()
    })

    it('should update a comment', async () => {
      // Create comment first
      const commentData = {
        id: 'test-comment-3',
        postId: 'post1',
        authorId: 'user2',
        content: 'Original comment',
      }
      newsfeed.createComment(commentData)

      const updates = {
        content: 'Updated comment',
      }

      // Add a small delay to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10))

      const updatedComment = newsfeed.updateComment('test-comment-3', updates)
      expect(updatedComment).toBeDefined()
      expect(updatedComment?.content).toBe('Updated comment')
      expect(updatedComment?.updatedAt.getTime()).toBeGreaterThan(updatedComment?.createdAt.getTime() || 0)
    })

    it('should return null when updating non-existent comment', () => {
      const updates = { content: 'New content' }
      const result = newsfeed.updateComment('non-existent', updates)
      expect(result).toBeNull()
    })

    it('should delete a comment', () => {
      // Create comment first
      const commentData = {
        id: 'test-comment-4',
        postId: 'post1',
        authorId: 'user2',
        content: 'Comment to delete',
      }
      newsfeed.createComment(commentData)

      const result = newsfeed.deleteComment('test-comment-4')
      expect(result).toBe(true)
      expect(newsfeed.getComment('test-comment-4')).toBeUndefined()
    })

    it('should return false when deleting non-existent comment', () => {
      const result = newsfeed.deleteComment('non-existent')
      expect(result).toBe(false)
    })
  })

  describe('Like Management', () => {
    it('should like a post', () => {
      const like = newsfeed.likePost('user1', 'post2')
      expect(like).toBeDefined()
      expect(like?.userId).toBe('user1')
      expect(like?.postId).toBe('post2')
      expect(like?.createdAt).toBeInstanceOf(Date)
    })

    it('should return null when liking non-existent post', () => {
      const like = newsfeed.likePost('user1', 'non-existent')
      expect(like).toBeNull()
    })

    it('should return null when already liked', () => {
      newsfeed.likePost('user1', 'post2')
      const like = newsfeed.likePost('user1', 'post2')
      expect(like).toBeNull()
    })

    it('should unlike a post', () => {
      newsfeed.likePost('user1', 'post2')
      const result = newsfeed.unlikePost('user1', 'post2')
      expect(result).toBe(true)
    })

    it('should return false when unliking non-liked post', () => {
      const result = newsfeed.unlikePost('user1', 'post2')
      expect(result).toBe(false)
    })

    it('should like a comment', () => {
      const _comment = newsfeed.createComment({
        id: 'comment1',
        postId: 'post1',
        authorId: 'user2',
        content: 'Nice post!',
      })

      const like = newsfeed.likeComment('user1', 'comment1')
      expect(like).toBeDefined()
      expect(like?.userId).toBe('user1')
      expect(like?.commentId).toBe('comment1')
    })

    it('should unlike a comment', () => {
      const _comment = newsfeed.createComment({
        id: 'comment2',
        postId: 'post1',
        authorId: 'user2',
        content: 'Another comment!',
      })

      newsfeed.likeComment('user1', 'comment2')
      const result = newsfeed.unlikeComment('user1', 'comment2')
      expect(result).toBe(true)
    })
  })

  describe('Follow Management', () => {
    it('should follow a user', () => {
      const follow = newsfeed.followUser('user1', 'user3')
      expect(follow).toBeDefined()
      expect(follow?.followerId).toBe('user1')
      expect(follow?.followingId).toBe('user3')
      expect(follow?.createdAt).toBeInstanceOf(Date)
    })

    it('should return null when following non-existent user', () => {
      const follow = newsfeed.followUser('user1', 'non-existent')
      expect(follow).toBeNull()
    })

    it('should return null when following yourself', () => {
      const follow = newsfeed.followUser('user1', 'user1')
      expect(follow).toBeNull()
    })

    it('should return null when already following', () => {
      newsfeed.followUser('user1', 'user3')
      const follow = newsfeed.followUser('user1', 'user3')
      expect(follow).toBeNull()
    })

    it('should unfollow a user', () => {
      newsfeed.followUser('user1', 'user3')
      const result = newsfeed.unfollowUser('user1', 'user3')
      expect(result).toBe(true)
    })

    it('should return false when unfollowing non-followed user', () => {
      const result = newsfeed.unfollowUser('user1', 'user3')
      expect(result).toBe(false)
    })
  })

  describe('Feed Management', () => {
    it('should get user feed', () => {
      const feed = newsfeed.getFeed('user2')
      expect(Array.isArray(feed)).toBe(true)
      expect(feed.length).toBeGreaterThan(0)
    })

    it('should get user posts', () => {
      const posts = newsfeed.getUserPosts('user1')
      expect(Array.isArray(posts)).toBe(true)
      expect(posts.length).toBeGreaterThan(0)
    })

    it('should get post comments', () => {
      const _comment = newsfeed.createComment({
        id: 'comment3',
        postId: 'post1',
        authorId: 'user2',
        content: 'Test comment',
      })

      const comments = newsfeed.getPostComments('post1')
      expect(Array.isArray(comments)).toBe(true)
      expect(comments.length).toBeGreaterThan(0)
    })

    it('should support pagination', () => {
      const feed1 = newsfeed.getFeed('user2', 1)
      const feed2 = newsfeed.getFeed('user2', 2)

      expect(Array.isArray(feed1)).toBe(true)
      expect(Array.isArray(feed2)).toBe(true)
    })
  })

  describe('Search and Discovery', () => {
    it('should search posts by content', () => {
      const results = newsfeed.searchPosts('amazing')
      expect(Array.isArray(results)).toBe(true)
      expect(results.length).toBeGreaterThan(0)
    })

    it('should search posts by tags', () => {
      const results = newsfeed.searchPosts('development')
      expect(Array.isArray(results)).toBe(true)
      expect(results.length).toBeGreaterThan(0)
    })

    it('should search users by username', () => {
      const results = newsfeed.searchUsers('john')
      expect(Array.isArray(results)).toBe(true)
      expect(results.length).toBeGreaterThan(0)
    })

    it('should search users by display name', () => {
      const results = newsfeed.searchUsers('John Doe')
      expect(Array.isArray(results)).toBe(true)
      expect(results.length).toBeGreaterThan(0)
    })

    it('should get trending tags', () => {
      const trending = newsfeed.getTrendingTags(5)
      expect(Array.isArray(trending)).toBe(true)
      expect(trending.length).toBeGreaterThan(0)
      expect(trending[0]).toHaveProperty('tag')
      expect(trending[0]).toHaveProperty('count')
    })
  })

  describe('Statistics', () => {
    it('should get system statistics', () => {
      const stats = newsfeed.getStatistics()

      expect(stats).toHaveProperty('totalUsers')
      expect(stats).toHaveProperty('totalPosts')
      expect(stats).toHaveProperty('totalComments')
      expect(stats).toHaveProperty('totalLikes')
      expect(stats).toHaveProperty('totalFollows')
      expect(stats).toHaveProperty('averagePostsPerUser')
      expect(stats).toHaveProperty('averageLikesPerPost')
      expect(stats).toHaveProperty('averageCommentsPerPost')

      expect(typeof stats.totalUsers).toBe('number')
      expect(typeof stats.totalPosts).toBe('number')
      expect(typeof stats.totalComments).toBe('number')
      expect(typeof stats.totalLikes).toBe('number')
      expect(typeof stats.totalFollows).toBe('number')
    })
  })

  describe('Integration Tests', () => {
    it('should handle complete user workflow', () => {
      // Create user
      const user = newsfeed.createUser({
        id: 'workflow-user',
        username: 'workflow',
        email: 'workflow@example.com',
        displayName: 'Workflow User',
      })

      // Create post
      const post = newsfeed.createPost({
        id: 'workflow-post',
        authorId: 'workflow-user',
        content: 'Workflow test post',
        isPublic: true,
      })

      // Create comment
      const comment = newsfeed.createComment({
        id: 'workflow-comment',
        postId: 'workflow-post',
        authorId: 'user1',
        content: 'Nice workflow!',
      })

      // Like post
      const like = newsfeed.likePost('user1', 'workflow-post')

      // Follow user
      const follow = newsfeed.followUser('user1', 'workflow-user')

      expect(user).toBeDefined()
      expect(post).toBeDefined()
      expect(comment).toBeDefined()
      expect(like).toBeDefined()
      expect(follow).toBeDefined()

      // Verify counts
      const updatedPost = newsfeed.getPost('workflow-post')
      expect(updatedPost?.likes).toBe(1)
      expect(updatedPost?.comments).toBe(1)
    })

    it('should handle feed updates when following', () => {
      // Create new user
      const _newUser = newsfeed.createUser({
        id: 'new-user',
        username: 'newuser',
        email: 'new@example.com',
        displayName: 'New User',
      })

      // Create post for new user
      const _post = newsfeed.createPost({
        id: 'new-user-post',
        authorId: 'new-user',
        content: 'New user post',
        isPublic: true,
      })

      // Follow new user
      newsfeed.followUser('user1', 'new-user')

      // Check if post appears in feed
      const feed = newsfeed.getFeed('user1')
      const hasNewPost = feed.some(p => p.id === 'new-user-post')
      expect(hasNewPost).toBe(true)
    })

    it('should handle feed updates when unfollowing', () => {
      // Follow user2
      newsfeed.followUser('user1', 'user2')

      // Unfollow user2
      newsfeed.unfollowUser('user1', 'user2')

      // Check if user2's posts are removed from feed
      const feed = newsfeed.getFeed('user1')
      const hasUser2Posts = feed.some(p => p.authorId === 'user2')
      expect(hasUser2Posts).toBe(false)
    })
  })

  describe('Event Handling', () => {
    it('should emit user created event', async () => {
      return new Promise<void>((resolve) => {
        newsfeed.on('userCreated', (user) => {
          expect(user.id).toBe('event-user')
          resolve()
        })

        newsfeed.createUser({
          id: 'event-user',
          username: 'eventuser',
          email: 'event@example.com',
          displayName: 'Event User',
        })
      })
    })

    it('should emit post created event', async () => {
      return new Promise<void>((resolve) => {
        newsfeed.on('postCreated', (post) => {
          expect(post.id).toBe('event-post')
          resolve()
        })

        newsfeed.createPost({
          id: 'event-post',
          authorId: 'user1',
          content: 'Event test post',
          isPublic: true,
        })
      })
    })

    it('should emit comment created event', async () => {
      return new Promise<void>((resolve) => {
        newsfeed.on('commentCreated', (comment) => {
          expect(comment.id).toBe('event-comment')
          resolve()
        })

        newsfeed.createComment({
          id: 'event-comment',
          postId: 'post1',
          authorId: 'user2',
          content: 'Event test comment',
        })
      })
    })

    it('should emit like event', async () => {
      return new Promise<void>((resolve) => {
        newsfeed.on('postLiked', (data) => {
          expect(data.userId).toBe('user1')
          expect(data.postId).toBe('post2')
          resolve()
        })

        newsfeed.likePost('user1', 'post2')
      })
    })

    it('should emit follow event', async () => {
      return new Promise<void>((resolve) => {
        newsfeed.on('userFollowed', (data) => {
          expect(data.followerId).toBe('user1')
          expect(data.followingId).toBe('user3')
          resolve()
        })

        newsfeed.followUser('user1', 'user3')
      })
    })
  })
})
