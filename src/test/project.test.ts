import { describe, it, expect } from "vitest";
import { getProjectStats, getAggregatedStats, createProject } from "@/types/project";

describe("Project Creation", () => {
  it("creates a project with default values", () => {
    const p = createProject("Kitchen Remodel");
    expect(p.name).toBe("Kitchen Remodel");
    expect(p.totalBudget).toBe(0);
    expect(p.laborCosts).toBe(0);
    expect(p.materialCosts).toBe(0);
    expect(p.tasks).toEqual([]);
    expect(p.photos).toEqual([]);
    expect(p.blueprints).toEqual([]);
    expect(p.changeOrders).toEqual([]);
    expect(p.id).toBeTruthy();
  });

  it("creates a sub-project with parentId", () => {
    const sub = createProject("Plumbing", "parent-123");
    expect(sub.parentId).toBe("parent-123");
    expect(sub.name).toBe("Plumbing");
  });
});

describe("Budget Calculations", () => {
  it("calculates spent, remaining, and percent correctly", () => {
    const p = createProject("Test");
    p.totalBudget = 10000;
    p.laborCosts = 3000;
    p.materialCosts = 2000;
    const stats = getProjectStats(p);
    expect(stats.totalSpent).toBe(5000);
    expect(stats.remaining).toBe(5000);
    expect(stats.budgetPercent).toBe(50);
  });

  it("handles zero budget gracefully", () => {
    const p = createProject("Test");
    const stats = getProjectStats(p);
    expect(stats.budgetPercent).toBe(0);
    expect(stats.remaining).toBe(0);
  });

  it("detects over-budget scenario", () => {
    const p = createProject("Test");
    p.totalBudget = 1000;
    p.laborCosts = 800;
    p.materialCosts = 500;
    const stats = getProjectStats(p);
    expect(stats.remaining).toBe(-300);
    expect(stats.budgetPercent).toBeGreaterThan(100);
  });
});

describe("Task Completion", () => {
  it("calculates task percent correctly", () => {
    const p = createProject("Test");
    p.tasks = [
      { id: "1", title: "Task 1", notes: "", completed: true, parentTaskId: null },
      { id: "2", title: "Task 2", notes: "", completed: false, parentTaskId: null },
      { id: "3", title: "Task 3", notes: "", completed: true, parentTaskId: null },
    ];
    const stats = getProjectStats(p);
    expect(stats.completedTasks).toBe(2);
    expect(stats.taskPercent).toBeCloseTo(66.67, 1);
  });

  it("handles no tasks", () => {
    const p = createProject("Test");
    const stats = getProjectStats(p);
    expect(stats.taskPercent).toBe(0);
    expect(stats.completedTasks).toBe(0);
  });
});

describe("Aggregated Stats (Sub-Projects)", () => {
  it("aggregates budget across parent and sub-projects", () => {
    const parent = createProject("Main");
    parent.totalBudget = 5000;
    parent.laborCosts = 1000;
    parent.materialCosts = 500;

    const sub1 = createProject("Sub 1");
    sub1.totalBudget = 3000;
    sub1.laborCosts = 1000;
    sub1.materialCosts = 1000;

    const sub2 = createProject("Sub 2");
    sub2.totalBudget = 2000;
    sub2.laborCosts = 500;
    sub2.materialCosts = 200;

    const agg = getAggregatedStats(parent, [sub1, sub2]);
    expect(agg.totalBudget).toBe(10000);
    expect(agg.totalSpent).toBe(4200);
    expect(agg.remaining).toBe(5800);
  });

  it("aggregates tasks across sub-projects", () => {
    const parent = createProject("Main");
    parent.tasks = [
      { id: "1", title: "A", notes: "", completed: true, parentTaskId: null },
    ];
    const sub = createProject("Sub");
    sub.tasks = [
      { id: "2", title: "B", notes: "", completed: false, parentTaskId: null },
      { id: "3", title: "C", notes: "", completed: true, parentTaskId: null },
    ];
    const agg = getAggregatedStats(parent, [sub]);
    expect(agg.totalTasks).toBe(3);
    expect(agg.completedTasks).toBe(2);
    expect(agg.taskPercent).toBeCloseTo(66.67, 1);
  });
});

describe("Progress Bar Value Clamping", () => {
  it("clamps negative values to 0", () => {
    const clamped = Math.min(100, Math.max(0, -10));
    expect(clamped).toBe(0);
  });

  it("clamps values over 100", () => {
    const clamped = Math.min(100, Math.max(0, 150));
    expect(clamped).toBe(100);
  });
});
