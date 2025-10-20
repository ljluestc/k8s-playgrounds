import { EventEmitter } from 'node:events'

export interface User {
  id: string
  username: string
  email: string
  displayName: string
  avatar?: string
  bio?: string
  createdAt: Date
  updatedAt: Date
}

export interface Post {
  id: string
  authorId: string
  content: string
  mediaUrls?: string[]
  tags?: string[]
  likes: number
  comments: number
  shares: number
  createdAt: Date
  updatedAt: Date
  isPublic: boolean
}

export interface Comment {
  id: string
  postId: string
  authorId: string
  content: string
  likes: number
  createdAt: Date
  updatedAt: Date
}

export interface Like {
  id: string
  userId: string
  postId?: string
  commentId?: string
  createdAt: Date
}

export interface Follow {
  id: string
  followerId: string
  followingId: string
  createdAt: Date
}

export interface NewsfeedOptions {
  maxPostsPerPage?: number
  cacheSize?: number
  cacheTimeout?: number
}

export class NewsfeedSystem extends EventEmitter {
  private users: Map<string, User> = new Map()
  private posts: Map<string, Post> = new Map()
  private comments: Map<string, Comment> = new Map()
  private likes: Map<string, Like> = new Map()
  private follows: Map<string, Follow> = new Map()
  private userPosts: Map<string, string[]> = new Map()
  private userFeed: Map<string, string[]> = new Map()
  private postComments: Map<string, string[]> = new Map()
  private postLikes: Map<string, string[]> = new Map()
  private commentLikes: Map<string, string[]> = new Map()
  private userFollowing: Map<string, string[]> = new Map()
  private userFollowers: Map<string, string[]> = new Map()

  private maxPostsPerPage: number
  private cacheSize: number
  private cacheTimeout: number

  constructor(options: NewsfeedOptions = {}) {
    super()
    this.maxPostsPerPage = options.maxPostsPerPage || 20
    this.cacheSize = options.cacheSize || 1000
    this.cacheTimeout = options.cacheTimeout || 300000 // 5 minutes
    this.initializeDefaultData()
  }

  private initializeDefaultData(): void {
    // Create some default users
    this.createUser({
      id: 'user1',
      username: 'john_doe',
      email: 'john@example.com',
      displayName: 'John Doe',
      bio: 'Software developer and tech enthusiast',
    })

    this.createUser({
      id: 'user2',
      username: 'jane_smith',
      email: 'jane@example.com',
      displayName: 'Jane Smith',
      bio: 'Designer and creative thinker',
    })

    this.createUser({
      id: 'user3',
      username: 'bob_wilson',
      email: 'bob@example.com',
      displayName: 'Bob Wilson',
      bio: 'Entrepreneur and startup advisor',
    })

    // Create some default posts
    this.createPost({
      id: 'post1',
      authorId: 'user1',
      content: 'Just finished building an amazing new feature! 🚀',
      tags: ['development', 'coding', 'tech'],
      isPublic: true,
    })

    this.createPost({
      id: 'post2',
      authorId: 'user2',
      content: 'Beautiful sunset from my office window today 🌅',
      mediaUrls: ['https://example.com/sunset.jpg'],
      isPublic: true,
    })

    this.createPost({
      id: 'post3',
      authorId: 'user3',
      content: 'Excited to announce our new product launch! Check it out at example.com',
      tags: ['business', 'product', 'launch'],
      isPublic: true,
    })

    // Create some follows
    this.followUser('user2', 'user1')
    this.followUser('user3', 'user1')
    this.followUser('user1', 'user2')
  }

  // User Management
  public createUser(userData: Omit<User, 'createdAt' | 'updatedAt'>): User {
    const now = new Date()
    const user: User = {
      ...userData,
      createdAt: now,
      updatedAt: now,
    }

    this.users.set(user.id, user)
    this.userPosts.set(user.id, [])
    this.userFeed.set(user.id, [])
    this.userFollowing.set(user.id, [])
    this.userFollowers.set(user.id, [])

    this.emit('userCreated', user)
    return user
  }

  public getUser(userId: string): User | undefined {
    return this.users.get(userId)
  }

  public updateUser(userId: string, updates: Partial<Omit<User, 'id' | 'createdAt'>>): User | null {
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

    // Delete user's posts
    const userPostIds = this.userPosts.get(userId) || []
    userPostIds.forEach(postId => this.deletePost(postId))

    // Remove from follows
    const following = this.userFollowing.get(userId) || []
    following.forEach(followingId => this.unfollowUser(userId, followingId))

    const followers = this.userFollowers.get(userId) || []
    followers.forEach(followerId => this.unfollowUser(followerId, userId))

    // Clean up data structures
    this.users.delete(userId)
    this.userPosts.delete(userId)
    this.userFeed.delete(userId)
    this.userFollowing.delete(userId)
    this.userFollowers.delete(userId)

    this.emit('userDeleted', { userId })
    return true
  }

  // Post Management
  public createPost(postData: Omit<Post, 'likes' | 'comments' | 'shares' | 'createdAt' | 'updatedAt'>): Post {
    const now = new Date()
    const post: Post = {
      ...postData,
      likes: 0,
      comments: 0,
      shares: 0,
      createdAt: now,
      updatedAt: now,
    }

    this.posts.set(post.id, post)
    this.userPosts.get(post.authorId)?.push(post.id)
    this.postComments.set(post.id, [])
    this.postLikes.set(post.id, [])

    // Add to followers' feeds
    this.addToFollowersFeeds(post)

    this.emit('postCreated', post)
    return post
  }

  public getPost(postId: string): Post | undefined {
    return this.posts.get(postId)
  }

  public updatePost(postId: string, updates: Partial<Omit<Post, 'id' | 'authorId' | 'likes' | 'comments' | 'shares' | 'createdAt'>>): Post | null {
    const post = this.posts.get(postId)
    if (!post)
      return null

    const updatedPost: Post = {
      ...post,
      ...updates,
      updatedAt: new Date(),
    }

    this.posts.set(postId, updatedPost)
    this.emit('postUpdated', updatedPost)
    return updatedPost
  }

  public deletePost(postId: string): boolean {
    const post = this.posts.get(postId)
    if (!post)
      return false

    // Remove from user's posts
    const userPosts = this.userPosts.get(post.authorId) || []
    const index = userPosts.indexOf(postId)
    if (index > -1)
      userPosts.splice(index, 1)

    // Remove from all feeds
    this.removeFromAllFeeds(postId)

    // Delete associated comments and likes
    const commentIds = this.postComments.get(postId) || []
    commentIds.forEach(commentId => this.deleteComment(commentId))

    const likeIds = this.postLikes.get(postId) || []
    likeIds.forEach(likeId => this.likes.delete(likeId))

    // Clean up data structures
    this.posts.delete(postId)
    this.postComments.delete(postId)
    this.postLikes.delete(postId)

    this.emit('postDeleted', { postId })
    return true
  }

  // Comment Management
  public createComment(commentData: Omit<Comment, 'likes' | 'createdAt' | 'updatedAt'>): Comment {
    const now = new Date()
    const comment: Comment = {
      ...commentData,
      likes: 0,
      createdAt: now,
      updatedAt: now,
    }

    this.comments.set(comment.id, comment)
    this.postComments.get(comment.postId)?.push(comment.id)
    this.commentLikes.set(comment.id, [])

    // Update post comment count
    const post = this.posts.get(comment.postId)
    if (post) {
      post.comments++
      this.posts.set(comment.postId, post)
    }

    this.emit('commentCreated', comment)
    return comment
  }

  public getComment(commentId: string): Comment | undefined {
    return this.comments.get(commentId)
  }

  public updateComment(commentId: string, updates: Partial<Omit<Comment, 'id' | 'postId' | 'authorId' | 'likes' | 'createdAt'>>): Comment | null {
    const comment = this.comments.get(commentId)
    if (!comment)
      return null

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

    // Remove from post's comments
    const postComments = this.postComments.get(comment.postId) || []
    const index = postComments.indexOf(commentId)
    if (index > -1)
      postComments.splice(index, 1)

    // Update post comment count
    const post = this.posts.get(comment.postId)
    if (post) {
      post.comments--
      this.posts.set(comment.postId, post)
    }

    // Delete associated likes
    const likeIds = this.commentLikes.get(commentId) || []
    likeIds.forEach(likeId => this.likes.delete(likeId))

    // Clean up data structures
    this.comments.delete(commentId)
    this.commentLikes.delete(commentId)

    this.emit('commentDeleted', { commentId })
    return true
  }

  // Like Management
  public likePost(userId: string, postId: string): Like | null {
    if (!this.posts.has(postId))
      return null

    const likeId = `${userId}-${postId}`
    if (this.likes.has(likeId))
      return null // Already liked

    const like: Like = {
      id: likeId,
      userId,
      postId,
      createdAt: new Date(),
    }

    this.likes.set(likeId, like)
    this.postLikes.get(postId)?.push(likeId)

    // Update post like count
    const post = this.posts.get(postId)
    if (post) {
      post.likes++
      this.posts.set(postId, post)
    }

    this.emit('postLiked', { userId, postId })
    return like
  }

  public unlikePost(userId: string, postId: string): boolean {
    const likeId = `${userId}-${postId}`
    if (!this.likes.has(likeId))
      return false

    this.likes.delete(likeId)

    // Remove from post's likes
    const postLikes = this.postLikes.get(postId) || []
    const index = postLikes.indexOf(likeId)
    if (index > -1)
      postLikes.splice(index, 1)

    // Update post like count
    const post = this.posts.get(postId)
    if (post) {
      post.likes--
      this.posts.set(postId, post)
    }

    this.emit('postUnliked', { userId, postId })
    return true
  }

  public likeComment(userId: string, commentId: string): Like | null {
    if (!this.comments.has(commentId))
      return null

    const likeId = `${userId}-${commentId}`
    if (this.likes.has(likeId))
      return null // Already liked

    const like: Like = {
      id: likeId,
      userId,
      commentId,
      createdAt: new Date(),
    }

    this.likes.set(likeId, like)
    this.commentLikes.get(commentId)?.push(likeId)

    // Update comment like count
    const comment = this.comments.get(commentId)
    if (comment) {
      comment.likes++
      this.comments.set(commentId, comment)
    }

    this.emit('commentLiked', { userId, commentId })
    return like
  }

  public unlikeComment(userId: string, commentId: string): boolean {
    const likeId = `${userId}-${commentId}`
    if (!this.likes.has(likeId))
      return false

    this.likes.delete(likeId)

    // Remove from comment's likes
    const commentLikes = this.commentLikes.get(commentId) || []
    const index = commentLikes.indexOf(likeId)
    if (index > -1)
      commentLikes.splice(index, 1)

    // Update comment like count
    const comment = this.comments.get(commentId)
    if (comment) {
      comment.likes--
      this.comments.set(commentId, comment)
    }

    this.emit('commentUnliked', { userId, commentId })
    return true
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

    // Add following user's posts to follower's feed
    this.addUserPostsToFeed(followerId, followingId)

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

    // Remove following user's posts from follower's feed
    this.removeUserPostsFromFeed(followerId, followingId)

    this.emit('userUnfollowed', { followerId, followingId })
    return true
  }

  // Feed Management
  public getFeed(userId: string, page: number = 1): Post[] {
    const feed = this.userFeed.get(userId) || []
    const startIndex = (page - 1) * this.maxPostsPerPage
    const endIndex = startIndex + this.maxPostsPerPage
    const postIds = feed.slice(startIndex, endIndex)

    return postIds.map(postId => this.posts.get(postId)).filter(Boolean) as Post[]
  }

  public getUserPosts(userId: string, page: number = 1): Post[] {
    const userPostIds = this.userPosts.get(userId) || []
    const startIndex = (page - 1) * this.maxPostsPerPage
    const endIndex = startIndex + this.maxPostsPerPage
    const postIds = userPostIds.slice(startIndex, endIndex)

    return postIds.map(postId => this.posts.get(postId)).filter(Boolean) as Post[]
  }

  public getPostComments(postId: string, page: number = 1): Comment[] {
    const commentIds = this.postComments.get(postId) || []
    const startIndex = (page - 1) * this.maxPostsPerPage
    const endIndex = startIndex + this.maxPostsPerPage
    const pageCommentIds = commentIds.slice(startIndex, endIndex)

    return pageCommentIds.map(commentId => this.comments.get(commentId)).filter(Boolean) as Comment[]
  }

  // Search and Discovery
  public searchPosts(query: string, page: number = 1): Post[] {
    const allPosts = Array.from(this.posts.values())
    const filteredPosts = allPosts.filter(post =>
      post.content.toLowerCase().includes(query.toLowerCase())
      || post.tags?.some(tag => tag.toLowerCase().includes(query.toLowerCase())),
    )

    const startIndex = (page - 1) * this.maxPostsPerPage
    const endIndex = startIndex + this.maxPostsPerPage
    return filteredPosts.slice(startIndex, endIndex)
  }

  public searchUsers(query: string): User[] {
    const allUsers = Array.from(this.users.values())
    return allUsers.filter(user =>
      user.username.toLowerCase().includes(query.toLowerCase())
      || user.displayName.toLowerCase().includes(query.toLowerCase())
      || user.bio?.toLowerCase().includes(query.toLowerCase()),
    )
  }

  public getTrendingTags(limit: number = 10): Array<{ tag: string; count: number }> {
    const tagCounts: Map<string, number> = new Map()

    this.posts.forEach((post) => {
      post.tags?.forEach((tag) => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1)
      })
    })

    return Array.from(tagCounts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)
  }

  // Statistics
  public getStatistics(): {
    totalUsers: number
    totalPosts: number
    totalComments: number
    totalLikes: number
    totalFollows: number
    averagePostsPerUser: number
    averageLikesPerPost: number
    averageCommentsPerPost: number
  } {
    const totalUsers = this.users.size
    const totalPosts = this.posts.size
    const totalComments = this.comments.size
    const totalLikes = this.likes.size
    const totalFollows = this.follows.size

    return {
      totalUsers,
      totalPosts,
      totalComments,
      totalLikes,
      totalFollows,
      averagePostsPerUser: totalUsers > 0 ? totalPosts / totalUsers : 0,
      averageLikesPerPost: totalPosts > 0 ? totalLikes / totalPosts : 0,
      averageCommentsPerPost: totalPosts > 0 ? totalComments / totalPosts : 0,
    }
  }

  // Helper Methods
  private addToFollowersFeeds(post: Post): void {
    const followers = this.userFollowers.get(post.authorId) || []
    followers.forEach((followerId) => {
      const feed = this.userFeed.get(followerId) || []
      feed.unshift(post.id) // Add to beginning of feed
      this.userFeed.set(followerId, feed)
    })
  }

  private removeFromAllFeeds(postId: string): void {
    this.userFeed.forEach((feed, userId) => {
      const index = feed.indexOf(postId)
      if (index > -1) {
        feed.splice(index, 1)
        this.userFeed.set(userId, feed)
      }
    })
  }

  private addUserPostsToFeed(followerId: string, followingId: string): void {
    const userPosts = this.userPosts.get(followingId) || []
    const feed = this.userFeed.get(followerId) || []

    // Add posts in chronological order
    userPosts.forEach((postId) => {
      if (!feed.includes(postId))
        feed.unshift(postId)
    })

    this.userFeed.set(followerId, feed)
  }

  private removeUserPostsFromFeed(followerId: string, followingId: string): void {
    const userPosts = this.userPosts.get(followingId) || []
    const feed = this.userFeed.get(followerId) || []

    userPosts.forEach((postId) => {
      const index = feed.indexOf(postId)
      if (index > -1)
        feed.splice(index, 1)
    })

    this.userFeed.set(followerId, feed)
  }
}
