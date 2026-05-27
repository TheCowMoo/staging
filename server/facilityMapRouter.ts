import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, paidProcedure } from "./_core/trpc";
import {
  createFacilityFloorMap,
  getFacilityFloorMapsByFacility,
  getFacilityFloorMapById,
  updateFacilityFloorMap,
  deleteFacilityFloorMap,
  getFacilityById,
  getOrgMembershipForUser,
} from "./db";
import { storagePut } from "./storage";
import { nanoid } from "nanoid";

export const facilityMapRouter = router({
  // ─── List floor maps for a facility ──────────────────────────────────────────
  list: paidProcedure
    .input(z.object({ facilityId: z.number() }))
    .query(async ({ input }) => {
      return getFacilityFloorMapsByFacility(input.facilityId);
    }),

  // ─── Get a single floor map ─────────────────────────────────────────────────
  get: paidProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const map = await getFacilityFloorMapById(input.id);
      if (!map) throw new TRPCError({ code: "NOT_FOUND" });
      return map;
    }),

  // ─── Upload a floor plan image (PNG, JPEG, PDF) ──────────────────────────────
  upload: paidProcedure
    .input(z.object({
      facilityId: z.number(),
      name: z.string().min(1),
      floor: z.string().optional(),
      base64Data: z.string(),
      mimeType: z.string(),
      width: z.number().optional(),
      height: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const buffer = Buffer.from(input.base64Data, "base64");
      const ext = input.mimeType.split("/")[1] ?? "png";
      const fileKey = `floor-maps/${input.facilityId}/${nanoid()}.${ext}`;
      const { url } = await storagePut(fileKey, buffer, input.mimeType);

      const mapId = await createFacilityFloorMap({
        facilityId: input.facilityId,
        name: input.name,
        floor: input.floor ?? null,
        imageUrl: url,
        fileKey,
        mapData: null,
        annotations: null,
        width: input.width ?? null,
        height: input.height ?? null,
        createdByUserId: ctx.user.id,
      } as any);

      return { id: mapId, url };
    }),

  // ─── Save map data (drawn map JSON) ─────────────────────────────────────────
  saveMapData: paidProcedure
    .input(z.object({
      id: z.number(),
      mapData: z.any(),
      annotations: z.any().optional(),
    }))
    .mutation(async ({ input }) => {
      const existing = await getFacilityFloorMapById(input.id);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });

      await updateFacilityFloorMap(input.id, {
        mapData: JSON.stringify(input.mapData),
        ...(input.annotations !== undefined ? { annotations: JSON.stringify(input.annotations) } : {}),
      } as any);

      return { success: true };
    }),

  // ─── Save annotations (markers, zones, etc.) ────────────────────────────────
  saveAnnotations: paidProcedure
    .input(z.object({
      id: z.number(),
      annotations: z.any(),
    }))
    .mutation(async ({ input }) => {
      const existing = await getFacilityFloorMapById(input.id);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });

      await updateFacilityFloorMap(input.id, {
        annotations: JSON.stringify(input.annotations),
      } as any);

      return { success: true };
    }),

  // ─── Create a new drawn map (no image) ─────────────────────────────────────
  create: paidProcedure
    .input(z.object({
      facilityId: z.number(),
      name: z.string().min(1),
      floor: z.string().optional(),
      width: z.number().optional(),
      height: z.number().optional(),
      mapData: z.any().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const mapId = await createFacilityFloorMap({
        facilityId: input.facilityId,
        name: input.name,
        floor: input.floor ?? null,
        imageUrl: null,
        fileKey: null,
        mapData: input.mapData ? JSON.stringify(input.mapData) : null,
        annotations: null,
        width: input.width ?? null,
        height: input.height ?? null,
        createdByUserId: ctx.user.id,
      } as any);

      return { id: mapId };
    }),

  // ─── Delete a floor map ─────────────────────────────────────────────────────
  delete: paidProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteFacilityFloorMap(input.id);
      return { success: true };
    }),
});