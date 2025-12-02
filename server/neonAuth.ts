import type { RequestHandler } from "express";

// Neon Auth middleware - replaces isAuthenticated
export const requireAuth: RequestHandler = async (req, res, next) => {
  try {
    // Get user ID from Stack Auth's cookie-based authentication
    const userId = req.headers['x-stack-user-id'] as string;
    
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    // Attach user ID to request for compatibility with existing code
    (req as any).neonUser = { id: userId };
    next();
  } catch (error) {
    console.error('[NEON_AUTH] Authentication error:', error);
    res.status(401).json({ message: "Invalid or expired authentication" });
  }
};
