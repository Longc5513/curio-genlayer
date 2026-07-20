# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
"""Curio Enterprise — Multi-field Adjudication & Company Batch Management.

Features:
- Company CRUD + batch import
- Multi-field adjudication (tech, finance, legal, marketing, etc.)
- Scoring system with weighted criteria
- Batch processing for multiple companies
- Consensus-backed evaluation by GenLayer validators
"""

import json
from dataclasses import dataclass, field
from genlayer import *


# ── Data Models ──────────────────────────────────────────────────────────────

@allow_storage
@dataclass
class Company:
    company_id: str
    name: str
    industry: str
    description: str
    website: str
    contact_email: str
    created_at: str
    updated_at: str
    is_active: bool


@allow_storage
@dataclass
class AdjudicationTask:
    task_id: str
    company_id: str
    field: str              # tech, finance, legal, marketing, operations, etc.
    title: str
    description: str
    criteria: str           # JSON string of scoring criteria
    status: str             # pending, in_progress, completed, failed
    created_at: str
    updated_at: str


@allow_storage
@dataclass
class AdjudicationResult:
    result_id: str
    task_id: str
    company_id: str
    field: str
    overall_score: u8       # 0-100
    criteria_scores: str    # JSON: {"accuracy": 85, "completeness": 90, ...}
    verdict: str            # pass, fail, needs_review
    reasoning: str
    recommendations: str
    evaluator_notes: str
    completed_at: str


@allow_storage
@dataclass
class BatchJob:
    batch_id: str
    name: str
    company_ids: str        # JSON array of company IDs
    field: str
    criteria: str
    status: str             # pending, running, completed, partial
    total: u16
    completed: u16
    failed: u16
    created_at: str
    completed_at: str


# ── Contract ─────────────────────────────────────────────────────────────────

class CurioEnterprise(gl.Contract):
    """Multi-field adjudication and company batch management system."""

    # Storage
    companies: TreeMap[str, Company]
    company_ids: DynArray[str]
    tasks: TreeMap[str, AdjudicationTask]
    task_ids: DynArray[str]
    results: TreeMap[str, AdjudicationResult]
    result_ids: DynArray[str]
    batches: TreeMap[str, BatchJob]
    batch_ids: DynArray[str]

    # Counters
    total_companies: u256
    total_tasks: u256
    total_results: u256
    total_batches: u256

    def __init__(self):
        self.total_companies = u256(0)
        self.total_tasks = u256(0)
        self.total_results = u256(0)
        self.total_batches = u256(0)

    # ── Helpers ──────────────────────────────────────────────────────────────

    @staticmethod
    def _require_text(value: str, label: str, min_len: int, max_len: int) -> str:
        clean = value.strip()
        if len(clean) < min_len or len(clean) > max_len:
            raise gl.vm.UserError(f"{label} must be {min_len}-{max_len} chars")
        return clean

    @staticmethod
    def _now() -> str:
        return gl.message_raw["datetime"]

    @staticmethod
    def _serialize_company(c: Company) -> dict:
        return {
            "company_id": c.company_id,
            "name": c.name,
            "industry": c.industry,
            "description": c.description,
            "website": c.website,
            "contact_email": c.contact_email,
            "created_at": c.created_at,
            "updated_at": c.updated_at,
            "is_active": c.is_active,
        }

    @staticmethod
    def _serialize_task(t: AdjudicationTask) -> dict:
        return {
            "task_id": t.task_id,
            "company_id": t.company_id,
            "field": t.field,
            "title": t.title,
            "description": t.description,
            "criteria": t.criteria,
            "status": t.status,
            "created_at": t.created_at,
            "updated_at": t.updated_at,
        }

    @staticmethod
    def _serialize_result(r: AdjudicationResult) -> dict:
        return {
            "result_id": r.result_id,
            "task_id": r.task_id,
            "company_id": r.company_id,
            "field": r.field,
            "overall_score": int(r.overall_score),
            "criteria_scores": r.criteria_scores,
            "verdict": r.verdict,
            "reasoning": r.reasoning,
            "recommendations": r.recommendations,
            "evaluator_notes": r.evaluator_notes,
            "completed_at": r.completed_at,
        }

    @staticmethod
    def _serialize_batch(b: BatchJob) -> dict:
        return {
            "batch_id": b.batch_id,
            "name": b.name,
            "company_ids": b.company_ids,
            "field": b.field,
            "criteria": b.criteria,
            "status": b.status,
            "total": int(b.total),
            "completed": int(b.completed),
            "failed": int(b.failed),
            "created_at": b.created_at,
            "completed_at": b.completed_at,
        }

    # ── Company Management ───────────────────────────────────────────────────

    @gl.public.write
    def add_company(
        self,
        company_id: str,
        name: str,
        industry: str,
        description: str,
        website: str,
        contact_email: str,
    ) -> None:
        clean_id = self._require_text(company_id, "company_id", 2, 64).lower()
        if clean_id in self.companies:
            raise gl.vm.UserError("Company already exists")

        now = self._now()
        self.companies[clean_id] = Company(
            company_id=clean_id,
            name=self._require_text(name, "name", 1, 200),
            industry=self._require_text(industry, "industry", 1, 100),
            description=description.strip()[:2000],
            website=website.strip()[:500],
            contact_email=contact_email.strip()[:200],
            created_at=now,
            updated_at=now,
            is_active=True,
        )
        self.company_ids.append(clean_id)
        self.total_companies += u256(1)

    @gl.public.write
    def update_company(
        self,
        company_id: str,
        name: str,
        industry: str,
        description: str,
        website: str,
        contact_email: str,
    ) -> None:
        clean_id = company_id.strip().lower()
        if clean_id not in self.companies:
            raise gl.vm.UserError("Company not found")
        c = self.companies[clean_id]
        c.name = self._require_text(name, "name", 1, 200)
        c.industry = self._require_text(industry, "industry", 1, 100)
        c.description = description.strip()[:2000]
        c.website = website.strip()[:500]
        c.contact_email = contact_email.strip()[:200]
        c.updated_at = self._now()

    @gl.public.write
    def deactivate_company(self, company_id: str) -> None:
        clean_id = company_id.strip().lower()
        if clean_id not in self.companies:
            raise gl.vm.UserError("Company not found")
        self.companies[clean_id].is_active = False
        self.companies[clean_id].updated_at = self._now()

    @gl.public.write
    def batch_add_companies(self, companies_json: str) -> str:
        """Add multiple companies at once. companies_json is a JSON array."""
        try:
            items = json.loads(companies_json)
        except Exception:
            raise gl.vm.UserError("Invalid JSON for companies")
        if not isinstance(items, list):
            raise gl.vm.UserError("Expected a JSON array")

        added = []
        errors = []
        for item in items:
            try:
                cid = str(item.get("company_id", "")).strip().lower()
                if not cid or cid in self.companies:
                    errors.append(f"{cid}: already exists or empty")
                    continue
                now = self._now()
                self.companies[cid] = Company(
                    company_id=cid,
                    name=str(item.get("name", ""))[:200],
                    industry=str(item.get("industry", ""))[:100],
                    description=str(item.get("description", ""))[:2000],
                    website=str(item.get("website", ""))[:500],
                    contact_email=str(item.get("contact_email", ""))[:200],
                    created_at=now,
                    updated_at=now,
                    is_active=True,
                )
                self.company_ids.append(cid)
                self.total_companies += u256(1)
                added.append(cid)
            except Exception as e:
                errors.append(f"{item}: {str(e)}")

        return json.dumps({"added": added, "errors": errors, "total_added": len(added)})

    # ── Adjudication Tasks ───────────────────────────────────────────────────

    SUPPORTED_FIELDS = [
        "technology", "finance", "legal", "marketing", "operations",
        "hr", "compliance", "security", "quality", "sustainability",
        "customer_service", "innovation", "supply_chain", "data_analytics",
    ]

    @gl.public.write
    def create_task(
        self,
        task_id: str,
        company_id: str,
        field: str,
        title: str,
        description: str,
        criteria: str,
    ) -> None:
        clean_tid = self._require_text(task_id, "task_id", 2, 64).lower()
        if clean_tid in self.tasks:
            raise gl.vm.UserError("Task already exists")
        clean_cid = company_id.strip().lower()
        if clean_cid not in self.companies:
            raise gl.vm.UserError("Company not found")
        clean_field = field.strip().lower()
        if clean_field not in self.SUPPORTED_FIELDS:
            raise gl.vm.UserError(f"Unsupported field. Use: {', '.join(self.SUPPORTED_FIELDS)}")

        # Validate criteria is valid JSON
        try:
            json.loads(criteria)
        except Exception:
            raise gl.vm.UserError("criteria must be valid JSON")

        now = self._now()
        self.tasks[clean_tid] = AdjudicationTask(
            task_id=clean_tid,
            company_id=clean_cid,
            field=clean_field,
            title=self._require_text(title, "title", 3, 200),
            description=self._require_text(description, "description", 10, 5000),
            criteria=criteria,
            status="pending",
            created_at=now,
            updated_at=now,
        )
        self.task_ids.append(clean_tid)
        self.total_tasks += u256(1)

    @gl.public.write
    def batch_create_tasks(
        self,
        batch_name: str,
        company_ids_json: str,
        field: str,
        title_template: str,
        description_template: str,
        criteria: str,
    ) -> str:
        """Create adjudication tasks for multiple companies at once."""
        try:
            cids = json.loads(company_ids_json)
        except Exception:
            raise gl.vm.UserError("Invalid JSON for company_ids")
        if not isinstance(cids, list):
            raise gl.vm.UserError("Expected a JSON array of company IDs")

        clean_field = field.strip().lower()
        if clean_field not in self.SUPPORTED_FIELDS:
            raise gl.vm.UserError(f"Unsupported field: {clean_field}")

        batch_id = f"batch_{len(self.batch_ids)}_{self._now()[:10]}"
        now = self._now()
        created_tasks = []
        errors = []

        for cid in cids:
            cid = str(cid).strip().lower()
            if cid not in self.companies:
                errors.append(f"{cid}: company not found")
                continue
            tid = f"{batch_id}_{cid}"
            try:
                self.tasks[tid] = AdjudicationTask(
                    task_id=tid,
                    company_id=cid,
                    field=clean_field,
                    title=title_template.replace("{company}", self.companies[cid].name),
                    description=description_template.replace("{company}", self.companies[cid].name),
                    criteria=criteria,
                    status="pending",
                    created_at=now,
                    updated_at=now,
                )
                self.task_ids.append(tid)
                self.total_tasks += u256(1)
                created_tasks.append(tid)
            except Exception as e:
                errors.append(f"{cid}: {str(e)}")

        self.batches[batch_id] = BatchJob(
            batch_id=batch_id,
            name=self._require_text(batch_name, "batch_name", 1, 200),
            company_ids=json.dumps(cids),
            field=clean_field,
            criteria=criteria,
            status="pending" if len(created_tasks) > 0 else "failed",
            total=u16(len(cids)),
            completed=u16(0),
            failed=u16(len(errors)),
            created_at=now,
            completed_at="",
        )
        self.batch_ids.append(batch_id)
        self.total_batches += u256(1)

        return json.dumps({
            "batch_id": batch_id,
            "tasks_created": created_tasks,
            "errors": errors,
            "total_created": len(created_tasks),
        })

    # ── Adjudication Execution ───────────────────────────────────────────────

    def _build_eval_prompt(self, task: AdjudicationTask, company: Company) -> str:
        """Build the LLM evaluation prompt for multi-field adjudication."""
        return f"""You are an expert {task.field.upper()} auditor evaluating a company.

COMPANY INFORMATION:
- Name: {company.name}
- Industry: {company.industry}
- Description: {company.description}
- Website: {company.website}

EVALUATION TASK:
- Title: {task.title}
- Description: {task.description}

SCORING CRITERIA (JSON):
{task.criteria}

INSTRUCTIONS:
1. Evaluate the company against each criterion
2. Assign a score from 0-100 for each criterion
3. Calculate an overall weighted score
4. Determine verdict: pass (>=70), needs_review (40-69), fail (<40)
5. Provide specific recommendations for improvement

SECURITY RULES:
- Be objective and evidence-based
- Do not fabricate information
- If data is insufficient, note it in evaluator_notes
- Score conservatively when uncertain

Return ONLY valid JSON:
{{
  "criteria_scores": {{"criterion1": score, "criterion2": score, ...}},
  "overall_score": integer 0-100,
  "verdict": "pass" | "fail" | "needs_review",
  "reasoning": "detailed explanation under 1000 chars",
  "recommendations": "actionable improvement steps under 1000 chars",
  "evaluator_notes": "any caveats or data gaps"
}}"""

    @gl.public.write
    def adjudicate(self, task_id: str) -> None:
        """Run AI-powered adjudication on a single task."""
        clean_tid = task_id.strip().lower()
        if clean_tid not in self.tasks:
            raise gl.vm.UserError("Task not found")
        task = self.tasks[clean_tid]
        if task.status != "pending":
            raise gl.vm.UserError("Task is not pending")

        company = self.companies[task.company_id]
        prompt = self._build_eval_prompt(task, company)

        # Mark as in_progress
        task.status = "in_progress"
        task.updated_at = self._now()

        # Non-deterministic evaluation
        def leader_fn() -> dict:
            result = gl.nondet.exec_prompt(prompt, response_format="json")
            if isinstance(result, str):
                result = json.loads(result)
            return result

        def validator_fn(leader_result) -> bool:
            if not isinstance(leader_result, gl.vm.Return):
                return False
            try:
                data = leader_result.calldata
                # Validate structure
                if "overall_score" not in data or "verdict" not in data:
                    return False
                score = int(data["overall_score"])
                if score < 0 or score > 100:
                    return False
                if data["verdict"] not in ("pass", "fail", "needs_review"):
                    return False
                return True
            except Exception:
                return False

        result = gl.vm.run_nondet_unsafe(leader_fn, validator_fn)

        # Store result
        result_id = f"result_{clean_tid}_{self._now()[:10]}"
        now = self._now()

        self.results[result_id] = AdjudicationResult(
            result_id=result_id,
            task_id=clean_tid,
            company_id=task.company_id,
            field=task.field,
            overall_score=u8(int(result.get("overall_score", 0))),
            criteria_scores=json.dumps(result.get("criteria_scores", {})),
            verdict=str(result.get("verdict", "fail")),
            reasoning=str(result.get("reasoning", ""))[:1000],
            recommendations=str(result.get("recommendations", ""))[:1000],
            evaluator_notes=str(result.get("evaluator_notes", ""))[:1000],
            completed_at=now,
        )
        self.result_ids.append(result_id)
        self.total_results += u256(1)

        # Update task status
        task.status = "completed"
        task.updated_at = now

    @gl.public.write
    def batch_adjudicate(self, batch_id: str) -> str:
        """Run adjudication on all pending tasks in a batch."""
        clean_bid = batch_id.strip().lower()
        if clean_bid not in self.batches:
            raise gl.vm.UserError("Batch not found")
        batch = self.batches[clean_bid]
        batch.status = "running"

        completed = 0
        failed = 0
        for tid_str in self.task_ids:
            if tid_str.startswith(clean_bid):
                task = self.tasks.get(tid_str)
                if task and task.status == "pending":
                    try:
                        self.adjudicate(tid_str)
                        completed += 1
                    except Exception:
                        task.status = "failed"
                        failed += 1

        batch.completed = u16(completed)
        batch.failed = u16(failed)
        batch.status = "completed" if failed == 0 else "partial"
        batch.completed_at = self._now()

        return json.dumps({"completed": completed, "failed": failed})

    # ── View Functions ───────────────────────────────────────────────────────

    @gl.public.view
    def get_company(self, company_id: str) -> dict:
        cid = company_id.strip().lower()
        if cid not in self.companies:
            raise gl.vm.UserError("Company not found")
        return self._serialize_company(self.companies[cid])

    @gl.public.view
    def list_companies(self) -> list[dict]:
        return [self._serialize_company(self.companies[cid]) for cid in self.company_ids]

    @gl.public.view
    def list_active_companies(self) -> list[dict]:
        return [self._serialize_company(self.companies[cid])
                for cid in self.company_ids if self.companies[cid].is_active]

    @gl.public.view
    def list_tasks(self, company_id: str) -> list[dict]:
        cid = company_id.strip().lower()
        return [self._serialize_task(self.tasks[tid])
                for tid in self.task_ids if self.tasks[tid].company_id == cid]

    @gl.public.view
    def list_results(self, company_id: str) -> list[dict]:
        cid = company_id.strip().lower()
        return [self._serialize_result(self.results[rid])
                for rid in self.result_ids if self.results[rid].company_id == cid]

    @gl.public.view
    def get_batch(self, batch_id: str) -> dict:
        bid = batch_id.strip().lower()
        if bid not in self.batches:
            raise gl.vm.UserError("Batch not found")
        return self._serialize_batch(self.batches[bid])

    @gl.public.view
    def list_batches(self) -> list[dict]:
        return [self._serialize_batch(self.batches[bid]) for bid in self.batch_ids]

    @gl.public.view
    def get_contract_version(self) -> str:
        return "curio-enterprise/2.0.0"

    @gl.public.view
    def get_stats(self) -> dict:
        return {
            "total_companies": int(self.total_companies),
            "total_tasks": int(self.total_tasks),
            "total_results": int(self.total_results),
            "total_batches": int(self.total_batches),
            "supported_fields": self.SUPPORTED_FIELDS,
        }

    @gl.public.view
    def get_supported_fields(self) -> list[str]:
        return self.SUPPORTED_FIELDS
