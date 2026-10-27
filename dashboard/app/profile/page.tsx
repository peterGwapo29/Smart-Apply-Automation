'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  getCandidateProfile,
  updateCandidateProfile,
  addCandidateSkill,
  deleteCandidateSkill,
  deleteCandidateExperience,
  deleteCandidateProject,
  CandidateProfileData,
  SkillItemRecord,
  WorkExperienceRecord,
  PortfolioProjectRecord,
  EducationRecordItem,
  CertificationRecordItem,
} from '@/lib/api';

export default function CandidateProfilePage() {
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<CandidateProfileData | null>(null);
  const [isEditingBasic, setIsEditingBasic] = useState(false);
  const [basicForm, setBasicForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    location: '',
    headline: '',
    summary: '',
  });

  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillCat, setNewSkillCat] = useState('backend');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const data = await getCandidateProfile();
      setProfileData(data);
      setBasicForm({
        full_name: data.profile.full_name || '',
        email: data.profile.email || '',
        phone: data.profile.phone || '',
        location: data.profile.location || '',
        headline: data.profile.headline || '',
        summary: data.profile.summary || '',
      });
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    getCandidateProfile()
      .then((data) => {
        if (isMounted) {
          setProfileData(data);
          setBasicForm({
            full_name: data.profile.full_name || '',
            email: data.profile.email || '',
            phone: data.profile.phone || '',
            location: data.profile.location || '',
            headline: data.profile.headline || '',
            summary: data.profile.summary || '',
          });
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error(err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSaveBasicInfo = async () => {
    setStatusMsg(null);
    try {
      await updateCandidateProfile(basicForm);
      setIsEditingBasic(false);
      setStatusMsg({ type: 'success', text: 'Basic information updated successfully.' });
      await fetchProfile();
    } catch (err: unknown) {
      setStatusMsg({ type: 'error', text: err instanceof Error ? err.message : 'Update failed.' });
    }
  };

  const handleAddSkill = async () => {
    if (!newSkillName.trim()) return;
    setStatusMsg(null);
    try {
      await addCandidateSkill(newSkillName.trim(), newSkillCat);
      setNewSkillName('');
      await fetchProfile();
    } catch (err: unknown) {
      setStatusMsg({ type: 'error', text: err instanceof Error ? err.message : 'Failed to add skill.' });
    }
  };

  const handleDeleteSkill = async (id: number) => {
    try {
      await deleteCandidateSkill(id);
      await fetchProfile();
    } catch (err: unknown) {
      console.error(err);
    }
  };

  const handleDeleteExp = async (id: number) => {
    try {
      await deleteCandidateExperience(id);
      await fetchProfile();
    } catch (err: unknown) {
      console.error(err);
    }
  };

  const handleDeleteProject = async (id: number) => {
    try {
      await deleteCandidateProject(id);
      await fetchProfile();
    } catch (err: unknown) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <main className="max-w-5xl mx-auto py-16 text-center text-slate-500 text-sm">
        Loading candidate profile...
      </main>
    );
  }

  const p = profileData?.profile;

  return (
    <main className="max-w-5xl mx-auto py-10 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Candidate Profile</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Structured candidate information used for JobStreet match scoring and job applications.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/resumes"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
          >
            Upload / Replace Resume
          </Link>
        </div>
      </div>

      {statusMsg && (
        <div
          className={`p-3 rounded-lg text-xs border ${
            statusMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
              : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
          }`}
        >
          {statusMsg.text}
        </div>
      )}

      {/* Active Resume Callout */}
      {profileData?.active_resume && (
        <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-slate-600 dark:text-slate-300">
              Active Resume Source:{' '}
              <strong className="text-slate-900 dark:text-white">
                {profileData.active_resume.original_filename}
              </strong>{' '}
              ({(profileData.active_resume.file_size / 1024).toFixed(1)} KB)
            </span>
          </div>
          <Link
            href={`/resumes/${profileData.active_resume.id}/review`}
            className="text-blue-600 dark:text-blue-400 font-semibold hover:underline"
          >
            View Extraction
          </Link>
        </div>
      )}

      {/* 1. Basic Info Card */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Personal Information</h2>
          <button
            onClick={() => setIsEditingBasic(!isEditingBasic)}
            className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline"
          >
            {isEditingBasic ? 'Cancel' : 'Edit Information'}
          </button>
        </div>

        {isEditingBasic ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2">
            <div>
              <label className="block text-slate-500 mb-1">Full Name</label>
              <input
                type="text"
                value={basicForm.full_name}
                onChange={(e) => setBasicForm({ ...basicForm, full_name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-slate-500 mb-1">Email</label>
              <input
                type="email"
                value={basicForm.email}
                onChange={(e) => setBasicForm({ ...basicForm, email: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-slate-500 mb-1">Phone</label>
              <input
                type="text"
                value={basicForm.phone}
                onChange={(e) => setBasicForm({ ...basicForm, phone: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-slate-500 mb-1">Location</label>
              <input
                type="text"
                value={basicForm.location}
                onChange={(e) => setBasicForm({ ...basicForm, location: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-slate-500 mb-1">Headline</label>
              <input
                type="text"
                value={basicForm.headline}
                onChange={(e) => setBasicForm({ ...basicForm, headline: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-slate-500 mb-1">Summary</label>
              <textarea
                rows={3}
                value={basicForm.summary}
                onChange={(e) => setBasicForm({ ...basicForm, summary: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
            <div className="sm:col-span-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={handleSaveBasicInfo}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold"
              >
                Save Changes
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-slate-400 block">Name</span>
              <span className="font-semibold text-slate-900 dark:text-white text-sm">
                {p?.full_name || 'Not specified'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">Email</span>
              <span className="font-semibold text-slate-900 dark:text-white">{p?.email || 'Not specified'}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Phone</span>
              <span className="font-semibold text-slate-900 dark:text-white">{p?.phone || 'Not specified'}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Location</span>
              <span className="font-semibold text-slate-900 dark:text-white">{p?.location || 'Not specified'}</span>
            </div>
            <div className="sm:col-span-2">
              <span className="text-slate-400 block">Professional Headline</span>
              <span className="font-semibold text-slate-900 dark:text-white">{p?.headline || 'No headline'}</span>
            </div>
            <div className="sm:col-span-2">
              <span className="text-slate-400 block">Summary</span>
              <p className="text-slate-600 dark:text-slate-300 mt-1 whitespace-pre-line leading-relaxed">
                {p?.summary || 'No summary entered yet.'}
              </p>
            </div>
          </div>
        )}
      </section>

      {/* 2. Skills by Category */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Technical Skills</h2>
          <span className="text-xs text-slate-500">
            {profileData?.all_skills.length || 0} skills active
          </span>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {(['backend', 'frontend', 'database', 'tools', 'other'] as const).map((cat) => {
            const list = profileData?.skills[cat] || [];
            return (
              <div
                key={cat}
                className="p-4 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs uppercase font-bold tracking-wider text-slate-500">
                    {cat} ({list.length})
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {list.map((sk: SkillItemRecord) => (
                    <span
                      key={sk.id}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                    >
                      {sk.display_name}
                      <button
                        onClick={() => handleDeleteSkill(sk.id)}
                        className="text-slate-400 hover:text-rose-600 ml-1 font-bold"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  {list.length === 0 && (
                    <span className="text-[11px] text-slate-400 italic">No skills in this category.</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Add Skill Form */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center gap-2">
          <input
            type="text"
            placeholder="Add a new skill (e.g. GraphQL, Tailwind CSS)"
            value={newSkillName}
            onChange={(e) => setNewSkillName(e.target.value)}
            className="text-xs px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white flex-1"
          />
          <select
            value={newSkillCat}
            onChange={(e) => setNewSkillCat(e.target.value)}
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
        <h2 className="text-base font-bold text-slate-900 dark:text-white">Work Experience</h2>

        {(!profileData?.work_experiences || profileData.work_experiences.length === 0) ? (
          <p className="text-xs text-slate-400 italic">No work experience records stored.</p>
        ) : (
          <div className="space-y-4">
            {profileData.work_experiences.map((exp: WorkExperienceRecord) => (
              <div
                key={exp.id}
                className="p-4 border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50/50 dark:bg-slate-800/30 text-xs space-y-2"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">{exp.job_title}</h3>
                    <p className="text-slate-600 dark:text-slate-400">
                      {exp.company_name} •{' '}
                      <span className="font-semibold text-blue-600 dark:text-blue-400 capitalize">
                        {exp.classification.replace('_', ' ')}
                      </span>
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-500 font-mono">
                      {exp.start_date || 'N/A'} – {exp.is_current ? 'Present' : exp.end_date || 'N/A'}
                    </span>
                    <button
                      onClick={() => handleDeleteExp(exp.id)}
                      className="text-rose-600 hover:text-rose-700 font-semibold text-xs"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {exp.responsibilities && (
                  <p className="text-slate-600 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                    {exp.responsibilities}
                  </p>
                )}

                {exp.technologies_used && exp.technologies_used.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {exp.technologies_used.map((tech: string, i: number) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px]"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 4. Portfolio Projects */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-white">
          Portfolio Projects (Distinct from Employment)
        </h2>

        {(!profileData?.portfolio_projects || profileData.portfolio_projects.length === 0) ? (
          <p className="text-xs text-slate-400 italic">No portfolio projects saved.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {profileData.portfolio_projects.map((proj: PortfolioProjectRecord) => (
              <div
                key={proj.id}
                className="p-4 border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50/50 dark:bg-slate-800/30 text-xs space-y-2 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-slate-900 dark:text-white text-sm">{proj.name}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 capitalize">
                      {proj.category.replace('_', ' ')}
                    </span>
                  </div>

                  {proj.description && (
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-2">
                      {proj.description}
                    </p>
                  )}

                  {proj.technologies_used && proj.technologies_used.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {proj.technologies_used.map((t: string, i: number) => (
                        <span
                          key={i}
                          className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px]"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-end">
                  <button
                    onClick={() => handleDeleteProject(proj.id)}
                    className="text-rose-600 hover:text-rose-700 font-semibold"
                  >
                    Delete Project
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 5. Education & Certifications */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-3">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Education</h2>
          {(!profileData?.education || profileData.education.length === 0) ? (
            <p className="text-xs text-slate-400 italic">No education records.</p>
          ) : (
            <div className="space-y-3">
              {profileData.education.map((edu: EducationRecordItem) => (
                <div key={edu.id} className="text-xs border-b border-slate-100 dark:border-slate-800 pb-2">
                  <span className="font-bold text-slate-900 dark:text-white block">{edu.institution_name}</span>
                  <span className="text-slate-600 dark:text-slate-400 block">
                    {edu.qualification} {edu.field_of_study && `in ${edu.field_of_study}`}
                  </span>
                  {edu.completion_date && (
                    <span className="text-slate-400 text-[11px]">Completed: {edu.completion_date}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-3">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Certifications</h2>
          {(!profileData?.certifications || profileData.certifications.length === 0) ? (
            <p className="text-xs text-slate-400 italic">No certifications found.</p>
          ) : (
            <div className="space-y-3">
              {profileData.certifications.map((cert: CertificationRecordItem) => (
                <div key={cert.id} className="text-xs border-b border-slate-100 dark:border-slate-800 pb-2">
                  <span className="font-bold text-slate-900 dark:text-white block">{cert.name}</span>
                  {cert.issuing_organization && (
                    <span className="text-slate-600 dark:text-slate-400 block">{cert.issuing_organization}</span>
                  )}
                  {cert.issue_date && (
                    <span className="text-slate-400 text-[11px]">Issued: {cert.issue_date}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
