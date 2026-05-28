"""
Retrieval Quality Optimizer for RAG System

This module optimizes retrieval quality by:
- Reducing retrieval size (top_k = 5 instead of 22)
- Filtering low-relevance chunks (threshold >= 0.60)
- Deduplicating chunks
- Building structured context
- Prioritizing diversity across categories

Author: Financial Advisor Team
Version: 1.0.0
"""

import json
import logging
from pathlib import Path
from typing import List, Dict, Tuple, Set
from collections import defaultdict
import numpy as np

logger = logging.getLogger(__name__)


class RetrievalOptimizer:
    """Optimizes retrieval results for better quality."""

    # Relevance threshold - adjusted for all-MiniLM-L6-v2 typical scores (0.45-0.75)
    RELEVANCE_THRESHOLD = 0.45  # Lowered from 0.60 to prevent over-filtering

    # Maximum chunks to retrieve per query
    MAX_CHUNKS_PER_QUERY = 5

    # Category priority for diversity
    CATEGORY_PRIORITY = {
        'budgeting': 1,
        'debt_management': 2,
        'investment': 3,
        'savings': 4,
        'tax': 5,
        'emergency_fund': 6,
        'government_schemes': 7,
        'insurance': 8,
        'rbi_banking': 9
    }

    @staticmethod
    def filter_by_relevance(chunks: List[Dict], threshold: float = 0.45) -> List[Dict]:
        """
        Filter chunks by relevance score threshold with safety fallback.

        Args:
            chunks: List of retrieved chunks
            threshold: Minimum relevance score (0-1)

        Returns:
            Filtered chunks above threshold (or top chunks if none pass)
        """
        print("\n===== RETRIEVAL DEBUG =====")
        print(f"Total Retrieved Results: {len(chunks)}")
        
        # Show all retrieval scores
        for i, chunk in enumerate(chunks, 1):
            print(f"  [{i}] {chunk.get('source', 'unknown')} | Score: {chunk.get('relevance_score', 0):.4f}")
        
        # Filter by threshold
        filtered = [c for c in chunks if c.get('relevance_score', 0) >= threshold]
        
        print(f"\nFiltering with threshold: {threshold}")
        print(f"Chunks after filtering: {len(filtered)}")
        
        # SAFETY FALLBACK: If all chunks filtered out, use top results
        if not filtered and chunks:
            print("\n[WARNING] No chunks passed filtering!")
            print(f"[FALLBACK] Using top {min(5, len(chunks))} retrieval results instead")
            filtered = sorted(chunks, key=lambda x: x.get('relevance_score', 0), reverse=True)[:5]
            print(f"[FALLBACK] Selected {len(filtered)} chunks")
        
        logger.info(f"Filtered chunks: {len(chunks)} → {len(filtered)} (threshold: {threshold})")
        return filtered

    @staticmethod
    def deduplicate_chunks(chunks: List[Dict]) -> List[Dict]:
        """
        Remove duplicate chunks from same source/category.

        Args:
            chunks: List of chunks

        Returns:
            Deduplicated chunks (highest scoring per source)
        """
        seen_sources = {}

        for chunk in sorted(chunks, key=lambda x: x.get('relevance_score', 0), reverse=True):
            source = chunk.get('source', 'unknown')

            if source not in seen_sources:
                seen_sources[source] = chunk

        deduplicated = list(seen_sources.values())
        logger.info(f"Deduplicated chunks: {len(chunks)} → {len(deduplicated)}")
        return deduplicated

    @staticmethod
    def prioritize_diversity(chunks: List[Dict], max_chunks: int = 5) -> List[Dict]:
        """
        Prioritize diversity across categories.

        Args:
            chunks: List of chunks
            max_chunks: Maximum chunks to return

        Returns:
            Diverse chunks across categories
        """
        # Group by category
        by_category = defaultdict(list)
        for chunk in chunks:
            category = chunk.get('category', 'other').lower()
            by_category[category].append(chunk)

        # Sort categories by priority
        sorted_categories = sorted(
            by_category.items(),
            key=lambda x: RetrievalOptimizer.CATEGORY_PRIORITY.get(x[0], 999)
        )

        # Select chunks round-robin from categories
        selected = []
        category_idx = {cat: 0 for cat, _ in sorted_categories}

        while len(selected) < max_chunks and any(
            category_idx[cat] < len(chunks_list)
            for cat, chunks_list in sorted_categories
        ):
            for cat, chunks_list in sorted_categories:
                if len(selected) >= max_chunks:
                    break
                if category_idx[cat] < len(chunks_list):
                    selected.append(chunks_list[category_idx[cat]])
                    category_idx[cat] += 1

        logger.info(f"Prioritized diversity: {len(chunks)} → {len(selected)} chunks")
        return selected[:max_chunks]

    @staticmethod
    def optimize_retrieval(chunks: List[Dict], max_chunks: int = 5) -> Tuple[List[Dict], Dict]:
        """
        Optimize retrieval results through filtering, deduplication, and diversity.
        NEVER returns empty results - always has fallback.

        Args:
            chunks: Raw retrieved chunks
            max_chunks: Maximum chunks to return

        Returns:
            Tuple of (optimized chunks, optimization stats)
        """
        logger.info(f"Starting retrieval optimization: {len(chunks)} chunks")

        # SAFETY CHECK: If no chunks retrieved, return empty with stats
        if not chunks:
            print("\n[ERROR] No chunks retrieved from FAISS!")
            print("[FALLBACK] Returning empty results")
            return [], {
                'original_count': 0,
                'after_relevance_filter': 0,
                'after_deduplication': 0,
                'final_count': 0,
                'avg_relevance': 0.0,
                'categories': [],
                'sources': []
            }

        # Step 1: Filter by relevance (with fallback)
        filtered = RetrievalOptimizer.filter_by_relevance(
            chunks,
            threshold=RetrievalOptimizer.RELEVANCE_THRESHOLD
        )

        # SAFETY CHECK: Ensure we have results after filtering
        if not filtered:
            print("\n[ERROR] All chunks filtered out!")
            print(f"[FALLBACK] Using top {min(max_chunks, len(chunks))} chunks")
            filtered = sorted(chunks, key=lambda x: x.get('relevance_score', 0), reverse=True)[:max_chunks]

        # Step 2: Deduplicate
        deduplicated = RetrievalOptimizer.deduplicate_chunks(filtered)

        # SAFETY CHECK: Ensure we have results after deduplication
        if not deduplicated:
            print("\n[ERROR] All chunks removed during deduplication!")
            print(f"[FALLBACK] Using filtered chunks")
            deduplicated = filtered[:max_chunks]

        # Step 3: Prioritize diversity
        optimized = RetrievalOptimizer.prioritize_diversity(deduplicated, max_chunks=max_chunks)

        # FINAL SAFETY CHECK: Ensure we have results
        if not optimized:
            print("\n[ERROR] No chunks after optimization!")
            print(f"[FALLBACK] Using original top {min(max_chunks, len(chunks))} chunks")
            optimized = sorted(chunks, key=lambda x: x.get('relevance_score', 0), reverse=True)[:max_chunks]

        # Calculate statistics
        stats = {
            'original_count': len(chunks),
            'after_relevance_filter': len(filtered),
            'after_deduplication': len(deduplicated),
            'final_count': len(optimized),
            'avg_relevance': float(np.mean([c.get('relevance_score', 0) for c in optimized])) if optimized else 0,
            'categories': list(set(c.get('category', 'other') for c in optimized)),
            'sources': list(set(c.get('source', 'unknown') for c in optimized))
        }

        logger.info(f"Optimization complete: {stats['final_count']} chunks, avg relevance: {stats['avg_relevance']:.4f}")

        return optimized, stats


class ContextBuilder:
    """Builds structured context from retrieved chunks."""

    # Category to section mapping
    CATEGORY_SECTIONS = {
        'budgeting': 'BUDGETING GUIDELINES',
        'debt_management': 'EMI & DEBT MANAGEMENT',
        'investment': 'INVESTMENT KNOWLEDGE',
        'savings': 'SAVINGS STRATEGY',
        'tax': 'TAX OPTIMIZATION',
        'emergency_fund': 'EMERGENCY FUND PLANNING',
        'government_schemes': 'GOVERNMENT SCHEMES',
        'insurance': 'INSURANCE & PROTECTION',
        'rbi_banking': 'BANKING & RBI GUIDELINES'
    }

    @staticmethod
    def build_structured_context(chunks: List[Dict], profile: Dict, predictions: Dict) -> str:
        """
        Build structured context from chunks.
        NEVER returns empty context - always has fallback.

        Args:
            chunks: Optimized retrieved chunks
            profile: User financial profile
            predictions: ML predictions

        Returns:
            Structured context string (never empty)
        """
        context_parts = []

        # Section 1: User Profile
        context_parts.append(ContextBuilder._build_user_profile_section(profile))

        # Section 2: AI Financial Analysis
        context_parts.append(ContextBuilder._build_analysis_section(predictions))

        # Section 3: Retrieved Knowledge (grouped by category)
        if chunks:
            context_parts.append(ContextBuilder._build_knowledge_section(chunks))
        else:
            # FALLBACK: Add general financial knowledge if no chunks
            print("\n[WARNING] No chunks available for context!")
            print("[FALLBACK] Adding general financial principles")
            context_parts.append("""=== RETRIEVED FINANCIAL KNOWLEDGE ===

--- GENERAL FINANCIAL PRINCIPLES ---
[1] General Indian Financial Planning
- Build emergency fund (3-6 months expenses)
- Track expenses and create budget
- Avoid high EMI burden (< 30% of income)
- Start SIP investments early
- Diversify investments
- Use government schemes for tax benefits
- Maintain adequate insurance coverage
- Review financial plan quarterly""")

        context = "\n\n".join(context_parts)

        # FINAL SAFETY CHECK: Ensure context is not empty
        if not context.strip():
            print("\n[ERROR] Empty context generated!")
            print("[FALLBACK] Using minimal context")
            context = f"""=== USER PROFILE ===
Monthly Income: ₹{profile.get('monthlyIncome', 0):,.0f}
Financial Goal: {profile.get('financialGoal', 'Financial planning')}

=== GENERAL ADVICE ===
Focus on building emergency fund, tracking expenses, and starting investments."""

        print(f"\n[CONTEXT] Final context length: {len(context)} characters")
        
        return context

    @staticmethod
    def _build_user_profile_section(profile: Dict) -> str:
        """Build user profile section."""
        return f"""=== USER PROFILE ===
Occupation: {profile.get('occupation', 'N/A')}
Monthly Income: ₹{profile.get('monthlyIncome', 0):,.0f}
Monthly Expenses: ₹{profile.get('monthlyExpenses', 0):,.0f}
Current Savings: ₹{profile.get('currentSavings', 0):,.0f}
Existing Investments: ₹{profile.get('existingInvestments', 0):,.0f}
Total Debt: ₹{profile.get('loanAmount', 0) + profile.get('creditCardDebt', 0):,.0f}
Monthly EMI: ₹{profile.get('monthlyEMI', 0):,.0f}
Financial Goal: {profile.get('financialGoal', 'N/A')}
Risk Tolerance: {profile.get('riskTolerance', 'N/A')}
Investment Experience: {profile.get('investmentExperience', 'N/A')}"""

    @staticmethod
    def _build_analysis_section(predictions: Dict) -> str:
        """Build AI financial analysis section."""
        return f"""=== AI FINANCIAL ANALYSIS ===
Financial Score: {predictions.get('financial_score', 0):.1f}/100
Risk Level: {predictions.get('risk_level', 'N/A')}
Spending Behavior: {predictions.get('spending_behavior', 'N/A')}
Risk Confidence: {predictions.get('risk_confidence', 0):.1%}
Behavior Confidence: {predictions.get('behavior_confidence', 0):.1%}"""

    @staticmethod
    def _build_knowledge_section(chunks: List[Dict]) -> str:
        """Build retrieved knowledge section grouped by category."""
        # Group chunks by category
        by_category = defaultdict(list)
        for chunk in chunks:
            category = chunk.get('category', 'other').lower()
            by_category[category].append(chunk)

        sections = []
        sections.append("=== RETRIEVED FINANCIAL KNOWLEDGE ===")

        # Add chunks grouped by category
        for category in sorted(by_category.keys()):
            section_title = ContextBuilder.CATEGORY_SECTIONS.get(category, category.upper())
            sections.append(f"\n--- {section_title} ---")

            for i, chunk in enumerate(by_category[category], 1):
                source = chunk.get('source', 'unknown')
                relevance = chunk.get('relevance_score', 0)
                text = chunk.get('text', '')

                # Limit text to 300 chars per chunk
                text_preview = text[:300] + "..." if len(text) > 300 else text

                sections.append(f"\n[{i}] {source} (Relevance: {relevance:.2f})")
                sections.append(f"{text_preview}")

        return "\n".join(sections)


# Alias for backward compatibility
RetrievalOptimizer._build_user_profile_section = staticmethod(ContextBuilder._build_user_profile_section)
RetrievalOptimizer._build_analysis_section = staticmethod(ContextBuilder._build_analysis_section)
