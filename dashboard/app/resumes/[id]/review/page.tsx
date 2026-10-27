'use client';

import { Suspense, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  getResume,
  confirmResume,
  ProposedProfile,
  ExtractedSkill,
  ExtractedExperience,
  ExtractedProject,
} from '@/lib/api';

function ResumeReviewContent() {
  const params = useParams();
  const router = useRouter();
  const resumeId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [filename, setFilename] = useState('');
  const [profile, setProfile] = useState<ProposedProfile>({
    basic_info: {
      full_name: '',
      email: '',
      phone: '',
      location: '',
      headline: '',
      summary: '',
    },
    skills: [],
    work_experiences: [],
    portfolio_projects: [],
    education: [],
    certifications: [],
  });

  // New Skill inline input state
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillCat, setNewSkillCat] = useState<'backend' | 'frontend' | 'database' | 'tools' | 'other'>('backend');

  useEffect(() => {
    async function fetchDraft() {
      if (!resumeId) return;
      try {
        setLoading(true);
        const data = await getResume(resumeId);
        setFilename(data.resume.original_filename);
        if (data.proposed_profile) {
          setProfile(data.proposed_profile);
        }
      } catch (err: unknown) {
        setErrorMessage(err instanceof Error ? err.message : 'Failed to fetch resume details.');
      } finally {
        setLoading(false);
      }
    }
    fetchDraft();
  }, [resumeId]);

  // Handlers for Basic Info
  const updateBasicInfo = (field: string, value: string) => {
    setProfile((prev) => ({
      ...prev,
      basic_info: {
        ...prev.basic_info,
        [field]: value,
      },
    }));
  };

  // Skill Handlers
  const handleAddSkill = () => {
    if (!newSkillName.trim()) return;
    const exists = profile.skills.some(
      (s) => s.display_name.toLowerCase() === newSkillName.trim().toLowerCase()
    );
    if (exists) return;

    const newSkill: ExtractedSkill = {
      name: newSkillName.trim().toLowerCase(),
      display_name: newSkillName.trim(),
      category: newSkillCat,
      review_status: 'confirmed',
    };

    setProfile((prev) => ({
      ...prev,
      skills: [...prev.skills, newSkill],
    }));
    setNewSkillName('');
  };

  const handleRemoveSkill = (index: number) => {
    setProfile((prev) => ({
      ...prev,
      skills: prev.skills.filter((_, i) => i !== index),
    }));
  };

  // Work Experience Handlers
  const updateExperience = (
    index: number,
    field: keyof ExtractedExperience,
    value: string | boolean | string[] | null | undefined
  ) => {
    setProfile((prev) => {
      const updated = [...prev.work_experiences];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, work_experiences: updated };
    });
  };

  const removeExperience = (index: number) => {
    setProfile((prev) => ({
      ...prev,
      work_experiences: prev.work_experiences.filter((_, i) => i !== index),
    }));
  };

  // Portfolio Project Handlers
  const updateProject = (
    index: number,
    field: keyof ExtractedProject,
    value: string | string[] | null | undefined
  ) => {
    setProfile((prev) => {
      const updated = [...prev.portfolio_projects];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, portfolio_projects: updated };
    });
  };

  const removeProject = (index: number) => {
    setProfile((prev) => ({
      ...prev,
      portfolio_projects: prev.portfolio_projects.filter((_, i) => i !== index),
    }));
  };

  // Education Handlers
  const removeEducation = (index: number) => {
    setProfile((prev) => ({
      ...prev,
      education: prev.education.filter((_, i) => i !== index),
    }));
  };

  // Certification Handlers
  const removeCertification = (index: number) => {
    setProfile((prev) => ({
      ...prev,
      certifications: prev.certifications.filter((_, i) => i !== index),
    }));
  };

  // Final Confirmation
  const handleConfirm = async () => {
    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await confirmResume(resumeId, profile);
      setSuccessMessage('Candidate profile successfully confirmed and activated! Redirecting to profile...');
      setTimeout(() => {
        router.push('/profile');
      }, 1200);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to confirm profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="max-w-4xl mx-auto py-16 text-center text-slate-500 text-sm">
        Loading proposed extraction data...
      </main>
    );
  }

  return (
    <main className="max-w-5xl mx-auto py-10 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
              Pending Confirmation
            </span>
            <span className="text-xs text-slate-500">Source: {filename}</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">Review Extracted Profile</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Carefully review each proposed field before saving. You can edit, categorize, or reject any item.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/resumes"
            className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </Link>
          <button
            onClick={handleConfirm}
            disabled={saving}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center gap-2"
          >
            {saving ? 'Saving...' : 'Confirm & Save Profile'}
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
          <strong>Error:</strong> {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-300">
          {successMessage}
        </div>
      )}

      {/* 1. Basic Information */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center justify-between">
          <span>1. Basic Candidate Information</span>
          <span className="text-xs font-normal text-slate-500">Verify personal details</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
            <input
              type="text"
              value={profile.basic_info.full_name || ''}
              onChange={(e) => updateBasicInfo('full_name', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Email Address</label>
            <input
              type="email"
              value={profile.basic_info.email || ''}
              onChange={(e) => updateBasicInfo('email', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Phone Number</label>
            <input
              type="text"
              value={profile.basic_info.phone || ''}
              onChange={(e) => updateBasicInfo('phone', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Location</label>
            <input
              type="text"
              value={profile.basic_info.location || ''}
              onChange={(e) => updateBasicInfo('location', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Professional Headline</label>
            <input
              type="text"
              value={profile.basic_info.headline || ''}
              onChange={(e) => updateBasicInfo('headline', e.target.value)}
              placeholder="e.g. Senior Full-Stack Software Engineer (PHP / React)"
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Professional Summary</label>
            <textarea
              rows={3}
              value={profile.basic_info.summary || ''}
              onChange={(e) => updateBasicInfo('summary', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      </section>

      {/* 2. Categorized Skills */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center justify-between">
          <span>2. Technical Skills by Category</span>
          <span className="text-xs font-normal text-slate-500">Organized without inferring false proficiencies</span>
        </h2>

        {/* Existing Skills List */}
        <div className="flex flex-wrap gap-2">
          {profile.skills.map((skill, index) => (
            <span
              key={index}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
                skill.category === 'backend'
                  ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
                  : skill.category === 'frontend'
                  ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800'
                  : skill.category === 'database'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                  : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
              }`}
            >
              <span className="text-[10px] uppercase font-bold opacity-60">[{skill.category}]</span>
              {skill.display_name}
              <button
                type="button"
                onClick={() => handleRemoveSkill(index)}
                className="hover:text-rose-600 font-bold ml-1"
              >
                ×
              </button>
            </span>
          ))}
          {profile.skills.length === 0 && (
            <span className="text-xs text-slate-400 italic">No skills extracted yet.</span>
          )}
        </div>

        {/* Add Skill Bar */}
        <div className="pt-2 flex flex-col sm:flex-row items-center gap-2">
          <input
            type="text"
            placeholder="Add a new skill (e.g. Docker, Redis)"
            value={newSkillName}
            onChange={(e) => setNewSkillName(e.target.value)}
            className="text-xs px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white flex-1"
          />
          <select
            value={newSkillCat}
            onChange={(e) => setNewSkillCat(e.target.value as 'backend' | 'frontend' | 'database' | 'tools' | 'other')}
            className="text-xs px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            <option value="backend">Backend</option>
            <option value="frontend">Frontend</option>
            <option value="database">Database</option>
            <option value="tools">Tools</option>
            <option value="other">Other</option>
          </select>
          <button
            type="button"
            onClick={handleAddSkill}
            className="text-xs px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm"
          >
            Add Skill
          </button>
        </div>
      </section>

      {/* 3. Work Experience */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center justify-between">
          <span>3. Work Experience</span>
          <span className="text-xs font-normal text-slate-500">Employment, Freelance, Commission, & Contract</span>
        </h2>

        {profile.work_experiences.length === 0 ? (
          <p className="text-xs text-slate-400 italic">No work experience entries extracted.</p>
        ) : (
          <div className="space-y-4">
            {profile.work_experiences.map((exp, idx) => (
              <div
                key={idx}
                className="p-4 border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-800/40 text-xs space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-white">Entry #{idx + 1}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                      Pending Review
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeExperience(idx)}
                    className="text-rose-600 hover:text-rose-700 text-xs font-semibold self-start sm:self-auto"
                  >
                    Delete Entry
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-500 mb-1">Company / Organization</label>
                    <input
                      type="text"
                      value={exp.company_name}
                      onChange={(e) => updateExperience(idx, 'company_name', e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-500 mb-1">Job Title / Role</label>
                    <input
                      type="text"
                      value={exp.job_title}
                      onChange={(e) => updateExperience(idx, 'job_title', e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-500 mb-1 font-semibold text-blue-600 dark:text-blue-400">
                      Classification
                    </label>
                    <select
                      value={exp.classification}
                      onChange={(e) => updateExperience(idx, 'classification', e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium"
                    >
                      <option value="employment">Professional Employment</option>
                      <option value="freelance">Freelance Work</option>
                      <option value="commission">Commission-Based</option>
                      <option value="contract">Contract / Client-Based</option>
                      <option value="academic_project">Academic Project</option>
                      <option value="personal_project">Personal Project</option>
                      <option value="other">Other / Unclassified</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-500 mb-1">Start Date</label>
                    <input
                      type="text"
                      value={exp.start_date || ''}
                      onChange={(e) => updateExperience(idx, 'start_date', e.target.value)}
                      placeholder="e.g. 2021 or Jan 2021"
                      className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-500 mb-1">End Date</label>
                    <input
                      type="text"
                      value={exp.end_date || ''}
                      onChange={(e) => updateExperience(idx, 'end_date', e.target.value)}
                      placeholder="e.g. Present or Dec 2023"
                      className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="flex items-center pt-5">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={exp.is_current}
                        onChange={(e) => updateExperience(idx, 'is_current', e.target.checked)}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-slate-700 dark:text-slate-300">Current Position</span>
                    </label>
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-slate-500 mb-1">Responsibilities & Accomplishments</label>
                    <textarea
                      rows={2}
                      value={exp.responsibilities || ''}
                      onChange={(e) => updateExperience(idx, 'responsibilities', e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 4. Portfolio Projects (Separated from Employment) */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center justify-between">
          <span>4. Portfolio Projects (Distinct from Employment)</span>
          <span className="text-xs font-normal text-slate-500">Standalone personal, freelance, and capstone systems</span>
        </h2>

        {profile.portfolio_projects.length === 0 ? (
          <p className="text-xs text-slate-400 italic">No standalone portfolio projects detected.</p>
        ) : (
          <div className="space-y-4">
            {profile.portfolio_projects.map((proj, idx) => (
              <div
                key={idx}
                className="p-4 border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-800/40 text-xs space-y-3"
              >
                <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-700 pb-2">
                  <span className="font-bold text-slate-900 dark:text-white">Project #{idx + 1}</span>
                  <button
                    type="button"
                    onClick={() => removeProject(idx)}
                    className="text-rose-600 hover:text-rose-700 text-xs font-semibold"
                  >
                    Delete Project
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-500 mb-1">Project Name</label>
                    <input
                      type="text"
                      value={proj.name}
                      onChange={(e) => updateProject(idx, 'name', e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-500 mb-1">Category</label>
                    <select
                      value={proj.category}
                      onChange={(e) => updateProject(idx, 'category', e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium"
                    >
                      <option value="personal">Personal Project</option>
                      <option value="academic">Academic / Capstone</option>
                      <option value="freelance_client">Freelance Client Delivery</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-slate-500 mb-1">Description</label>
                    <textarea
                      rows={2}
                      value={proj.description || ''}
                      onChange={(e) => updateProject(idx, 'description', e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 5. Education & Certifications */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Education */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">5. Education</h2>
          {profile.education.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No education records found.</p>
          ) : (
            <div className="space-y-3">
              {profile.education.map((edu, idx) => (
                <div
                  key={idx}
                  className="p-3 border border-slate-200 dark:border-slate-800 rounded bg-slate-50 dark:bg-slate-800/40 text-xs flex justify-between items-start"
                >
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white block">{edu.institution_name}</span>
                    <span className="text-slate-600 dark:text-slate-400 block">
                      {edu.qualification} {edu.field_of_study && `in ${edu.field_of_study}`}
                    </span>
                    {edu.completion_date && (
                      <span className="text-slate-500 text-[11px]">Completed: {edu.completion_date}</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeEducation(idx)}
                    className="text-rose-600 hover:text-rose-700 text-xs font-semibold"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Certifications */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">6. Certifications</h2>
          {profile.certifications.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No certifications extracted.</p>
          ) : (
            <div className="space-y-3">
              {profile.certifications.map((cert, idx) => (
                <div
                  key={idx}
                  className="p-3 border border-slate-200 dark:border-slate-800 rounded bg-slate-50 dark:bg-slate-800/40 text-xs flex justify-between items-start"
                >
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white block">{cert.name}</span>
                    {cert.issuing_organization && (
                      <span className="text-slate-600 dark:text-slate-400 block">{cert.issuing_organization}</span>
                    )}
                    {cert.issue_date && (
                      <span className="text-slate-500 text-[11px]">Issued: {cert.issue_date}</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeCertification(idx)}
                    className="text-rose-600 hover:text-rose-700 text-xs font-semibold"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Bottom Sticky Action Bar */}
      <div className="sticky bottom-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur border border-slate-300 dark:border-slate-700 rounded-xl p-4 shadow-lg flex items-center justify-between">
        <div>
          <span className="text-xs font-bold text-slate-900 dark:text-white block">Ready to confirm?</span>
          <span className="text-[11px] text-slate-500">
            This will activate this resume and save all verified details to your profile.
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/resumes"
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900"
          >
            Cancel
          </Link>
          <button
            onClick={handleConfirm}
            disabled={saving}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
          >
            {saving ? 'Confirming...' : 'Confirm & Save Profile'}
          </button>
        </div>
      </div>
    </main>
  );
}

export default function ResumeReviewPage() {
  return (
    <Suspense fallback={<div className="max-w-4xl mx-auto py-16 text-center text-slate-500 text-sm">Loading review...</div>}>
      <ResumeReviewContent />
    </Suspense>
  );
}
