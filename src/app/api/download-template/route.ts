import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') || 'speakers'

  let csvContent = ''
  let filename = ''

  switch (type) {
    case 'speakers':
      filename = 'speakers_template.csv'
      csvContent = `name,email,title,organization,bio
"Dr. Sarah Johnson","sarah.johnson@university.edu","Professor","University of Medical Sciences","Expert in medical research with 15+ years of experience"
"Dr. Michael Chen","michael.chen@research.org","Research Director","National Research Institute","Leading researcher in biotechnology and drug development"
"Dr. Emily Rodriguez","emily.rodriguez@hospital.com","Chief Medical Officer","City General Hospital","Specialist in emergency medicine and hospital administration"
"Prof. David Thompson","david.thompson@college.edu","Dean","Medical College","Academic leader with expertise in medical education"
"Dr. Lisa Wang","lisa.wang@clinic.org","Senior Physician","Specialty Clinic","Experienced clinician in internal medicine"`
      break

    case 'moderators':
      filename = 'moderators_template.csv'
      csvContent = `name,email,title,organization,bio
"Dr. Robert Smith","robert.smith@conference.org","Senior Moderator","Conference Committee","Experienced moderator for scientific conferences"
"Prof. Maria Garcia","maria.garcia@university.edu","Professor","University Department","Expert in facilitating academic discussions"
"Dr. James Wilson","james.wilson@institute.org","Research Fellow","Research Institute","Specialist in panel discussions and Q&A sessions"`
      break

    case 'chairpersons':
      filename = 'chairpersons_template.csv'
      csvContent = `name,email,title,organization,bio
"Dr. Patricia Brown","patricia.brown@conference.org","Conference Chair","Organizing Committee","Distinguished chairperson with 20+ years of experience"
"Prof. Thomas Davis","thomas.davis@university.edu","Department Head","University Faculty","Academic leader and experienced session chair"
"Dr. Jennifer Lee","jennifer.lee@hospital.org","Medical Director","Hospital Administration","Healthcare leader and conference organizer"`
      break

    default:
      filename = 'participants_template.csv'
      csvContent = `name,email,title,organization,bio
"Dr. Sarah Johnson","sarah.johnson@university.edu","Professor","University of Medical Sciences","Expert in medical research with 15+ years of experience"`
  }

  return new NextResponse(csvContent, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
} 