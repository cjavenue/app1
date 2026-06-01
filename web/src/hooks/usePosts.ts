import { useCallback, useRef, useState } from 'react';
import { supabase, hasSupabase } from '../lib/supabase';
import { ensureSession } from '../services/session';
import { squareJpeg } from '../lib/image';
import type { CategoryKey } from '../lib/categories';
import type { Coords } from './useLocation';

export interface MapPost {
  id: string;
  body: string;
  category: CategoryKey;
  imageUrl: string | null;
  nickname: string;
  latitude: number;
  longitude: number;
  commentCount: number;
  createdAt: string;
  expiresAt: string;
  isMine: boolean;
}

export interface PostComment {
  id: string;
  body: string;
  nickname: string;
  createdAt: string;
  isMine: boolean;
  canDelete: boolean;
}

export interface Bounds {
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
}

export type Ok<T = undefined> = { ok: true; value?: T } | { ok: false; message: string };

const BUCKET = 'post-images';

export function usePosts() {
  const [posts, setPosts] = useState<MapPost[]>([]);
  const lastBounds = useRef<Bounds | null>(null);

  const loadBounds = useCallback(async (b: Bounds) => {
    lastBounds.current = b;
    if (!hasSupabase || !supabase) return;
    const { data, error } = await supabase.rpc('posts_in_bounds', {
      p_min_lat: b.minLat,
      p_min_lng: b.minLng,
      p_max_lat: b.maxLat,
      p_max_lng: b.maxLng,
    });
    if (error || !data) return;
    const rows = data as Array<{
      id: string; body: string; category: CategoryKey; image_url: string | null;
      nickname: string; lat: number; lng: number; comment_count: number;
      created_at: string; expires_at: string; is_mine: boolean;
    }>;
    setPosts(
      rows.map((r) => ({
        id: r.id,
        body: r.body,
        category: r.category,
        imageUrl: r.image_url,
        nickname: r.nickname,
        latitude: r.lat,
        longitude: r.lng,
        commentCount: Number(r.comment_count),
        createdAt: r.created_at,
        expiresAt: r.expires_at,
        isMine: r.is_mine,
      }))
    );
  }, []);

  const refresh = useCallback(() => {
    if (lastBounds.current) return loadBounds(lastBounds.current);
  }, [loadBounds]);

  // Load posts in a generous box around a point (~22km) for the feed/activity
  // views, which don't have a map viewport of their own.
  const loadAround = useCallback(
    (coords: Coords) => {
      const d = 0.2;
      return loadBounds({
        minLat: coords.latitude - d,
        minLng: coords.longitude - d,
        maxLat: coords.latitude + d,
        maxLng: coords.longitude + d,
      });
    },
    [loadBounds]
  );

  const create = useCallback(
    async (
      body: string,
      category: CategoryKey,
      coords: Coords,
      imageFile: File | null
    ): Promise<Ok> => {
      if (!supabase) return { ok: false, message: 'Backend not configured' };
      await ensureSession();
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData?.user?.id;
      if (!uid) return { ok: false, message: 'Not signed in' };

      let imagePath: string | null = null;
      let imageUrl: string | null = null;
      if (imageFile) {
        try {
          const blob = await squareJpeg(imageFile);
          const path = `${uid}/${crypto.randomUUID()}.jpg`;
          const { error: upErr } = await supabase.storage
            .from(BUCKET)
            .upload(path, blob, { contentType: 'image/jpeg', upsert: false });
          if (upErr) return { ok: false, message: 'Image upload failed. Try again.' };
          imagePath = path;
          imageUrl = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
        } catch (e) {
          return { ok: false, message: (e as Error).message };
        }
      }

      const { error } = await supabase.rpc('create_post', {
        p_body: body,
        p_category: category,
        p_lat: coords.latitude,
        p_lng: coords.longitude,
        p_image_path: imagePath,
        p_image_url: imageUrl,
      });
      if (error) {
        return {
          ok: false,
          message: error.message.includes('invalid_body')
            ? 'Your text is too long (140 max).'
            : error.message.includes('empty_post')
              ? 'Add a photo or some text.'
              : 'Could not post. Try again.',
        };
      }
      await refresh();
      return { ok: true };
    },
    [refresh]
  );

  const deleteMine = useCallback(async (): Promise<Ok> => {
    if (!supabase) return { ok: false, message: 'Backend not configured' };
    const { error } = await supabase.rpc('delete_my_post');
    if (error) return { ok: false, message: 'Could not delete.' };
    await refresh();
    return { ok: true };
  }, [refresh]);

  const listComments = useCallback(async (postId: string): Promise<PostComment[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase.rpc('post_comments_list', { p_post_id: postId });
    if (error || !data) return [];
    return (data as Array<{
      id: string; body: string; nickname: string; created_at: string; is_mine: boolean; can_delete: boolean;
    }>).map((c) => ({
      id: c.id,
      body: c.body,
      nickname: c.nickname,
      createdAt: c.created_at,
      isMine: c.is_mine,
      canDelete: c.can_delete,
    }));
  }, []);

  const addComment = useCallback(async (postId: string, body: string): Promise<Ok> => {
    if (!supabase) return { ok: false, message: 'Backend not configured' };
    await ensureSession();
    const { error } = await supabase.rpc('add_comment', { p_post_id: postId, p_body: body.trim() });
    if (error) {
      return {
        ok: false,
        message: error.message.includes('invalid_comment')
          ? 'Comment must be 1–200 characters.'
          : error.message.includes('post_unavailable')
            ? 'This post has expired.'
            : 'Could not comment.',
      };
    }
    return { ok: true };
  }, []);

  const deleteComment = useCallback(async (commentId: string): Promise<Ok> => {
    if (!supabase) return { ok: false, message: 'Backend not configured' };
    const { error } = await supabase.rpc('delete_comment', { p_comment_id: commentId });
    if (error) return { ok: false, message: 'Could not delete.' };
    return { ok: true };
  }, []);

  return { posts, loadBounds, loadAround, refresh, create, deleteMine, listComments, addComment, deleteComment };
}
