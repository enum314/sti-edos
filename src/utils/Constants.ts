export enum Permission {
	PANEL_USER_PROFILES_VIEW = 'View User Profiles',

	PANEL_VIOLATION_MANAGE = 'Manage User Violations',

	PANEL_PERMIT_MANAGE = 'Manage User Permits',

	PANEL_ANNOUNCEMENT_MANAGE = 'Manage Announcements',
}

export const permissionList = Object.keys(Permission).map((key) => ({
	label: Permission[key as keyof typeof Permission],
	value: Permission[key as keyof typeof Permission],
}));

export const linkRegex = /^https?:\/\/\w+(\.\w+)*(:[0-9]+)?\/?(\/[.\w]*)*/;

export const PermitTypes = [
	{
		value: 'No ID Pass - Student does not have or forgot to bring school ID',
		label: 'No ID Pass - Student does not have or forgot to bring school ID',
		group: 'Attendance Permits',
	},
	{
		value: 'No Uniform Pass - Student is not wearing proper school uniform',
		label: 'No Uniform Pass - Student is not wearing proper school uniform',
		group: 'Attendance Permits',
	},
	{
		value: 'Exit Pass - Student needs to leave campus early for a valid reason',
		label: 'Exit Pass - Student needs to leave campus early for a valid reason',
		group: 'School Exit Permits',
	},
	{
		value: 'Late Pass - Student arrived late to school due to a valid reason',
		label: 'Late Pass - Student arrived late to school due to a valid reason',
		group: 'Attendance Permits',
	},
	{
		value: 'Early Release Pass - Student needs to leave school early for a valid reason',
		label: 'Early Release Pass - Student needs to leave school early for a valid reason',
		group: 'School Exit Permits',
	},
	{
		value: 'Off-Campus Pass - Student needs to leave school during school hours for a valid reason',
		label: 'Off-Campus Pass - Student needs to leave school during school hours for a valid reason',
		group: 'School Exit Permits',
	},
	{
		value: 'Parking Pass - Student is authorized to park on campus with a vehicle',
		label: 'Parking Pass - Student is authorized to park on campus with a vehicle',
		group: 'Transportation Permits',
	},
	{
		value: 'Event Pass - Student is authorized to attend a school event outside of school hours',
		label: 'Event Pass - Student is authorized to attend a school event outside of school hours',
		group: 'Event Permits',
	},
	{
		value: 'Other - For any other type of permit not listed above',
		label: 'Other - For any other type of permit not listed above',
		group: 'Other Permits',
	},
];

export const ViolationTypes = [
	{
		group: 'Minor Offenses',
		label: 'Non-adherence to the "STI Student Decorum"',
		value: 'Non-adherence to the "STI Student Decorum"',
	},
	{
		group: 'Minor Offenses',
		label: 'Discourtesy towards any member of the STI community including campus visitors',
		value: 'Discourtesy towards any member of the STI community including campus visitors',
	},
	{
		group: 'Minor Offenses',
		label: 'Lending/borrowing school ID, wearing, or using tampered ID',
		value: 'Lending/borrowing school ID, wearing, or using tampered ID',
	},
	{
		group: 'Minor Offenses',
		label: 'Non-wearing of school uniform, improper use of school uniform, and/or ID inside school premises',
		value: 'Non-wearing of school uniform, improper use of school uniform, and/or ID inside school premises',
	},
	{
		group: 'Minor Offenses',
		label: 'Wearing of inappropriate campus attire',
		value: 'Wearing of inappropriate campus attire',
	},
	{
		group: 'Minor Offenses',
		label: "Losing or forgetting one's ID three (3) times",
		value: "Losing or forgetting one's ID three (3) times",
	},
	{
		group: 'Minor Offenses',
		label: 'Disrespect to national symbols or any other similar infraction',
		value: 'Disrespect to national symbols or any other similar infraction',
	},
	{
		group: 'Minor Offenses',
		label: 'Irresponsible use of school property',
		value: 'Irresponsible use of school property',
	},
	{
		group: 'Minor Offenses',
		label: 'Gambling in any form within the school premises or during official functions',
		value: 'Gambling in any form within the school premises or during official functions',
	},
	{
		group: 'Minor Offenses',
		label: 'Disruption of classes, school-sanctioned activities, and peace and order',
		value: 'Disruption of classes, school-sanctioned activities, and peace and order',
	},
	{
		group: 'Minor Offenses',
		label: 'Exhibiting displays of affection that negatively affect the reputation of the individuals',
		value: 'Exhibiting displays of affection that negatively affect the reputation of the individuals',
	},
	{
		group: 'Minor Offenses',
		label: 'Violation of classroom, laboratory, library, and other school offices procedure',
		value: 'Violation of classroom, laboratory, library, and other school offices procedure',
	},
	{
		group: 'Minor Offenses',
		label: 'Smoking inside the campus',
		value: 'Smoking inside the campus',
	},
	{
		group: 'Minor Offenses',
		label: 'Allowing a non-STI student to enter the campus unauthorized',
		value: 'Allowing a non-STI student to enter the campus unauthorized',
	},
	{
		group: 'Minor Offenses',
		label: 'Bringing of pets in the school premises',
		value: 'Bringing of pets in the school premises',
	},
	{
		group: 'Minor Offenses',
		label: 'Minor Offense - Others',
		value: 'Minor Offense - Others',
	},
	{
		group: 'Major Offenses - Category A',
		label: 'More than three (3) commissions of any minor offense',
		value: 'More than three (3) commissions of any minor offense',
	},
	{
		group: 'Major Offenses - Category A',
		label: 'Entering the campus in a state of intoxication, bringing, and/or drinking liquor inside the campus',
		value: 'Entering the campus in a state of intoxication, bringing, and/or drinking liquor inside the campus',
	},
	{
		group: 'Major Offenses - Category A',
		label: 'Cheating',
		value: 'Cheating',
	},
	{
		group: 'Major Offenses - Category A',
		label: 'Major Offense A - Others',
		value: 'Major Offense A - Others',
	},
	{
		group: 'Major Offenses - Category B',
		label: 'Vandalism/Destruction of property belonging to any member of the STI community, visitors, or guests while in the school campus',
		value: 'Vandalism/Destruction of property belonging to any member of the STI community, visitors, or guests while in the school campus',
	},
	{
		group: 'Major Offenses - Category B',
		label: 'Posting and/or uploading of statements, photos, other graphical images and/or videos disrespectful to the STI Brand, another student, faculty member or any member of the STI community including campus visitors',
		value: 'Posting and/or uploading of statements, photos, other graphical images and/or videos disrespectful to the STI Brand, another student, faculty member or any member of the STI community including campus visitors',
	},
	{
		group: 'Major Offenses - Category B',
		label: 'Frequent places of ill repute wearing the school uniform',
		value: 'Frequent places of ill repute wearing the school uniform',
	},
	{
		group: 'Major Offenses - Category B',
		label: 'Issuing a false testimony during official investigations',
		value: 'Issuing a false testimony during official investigations',
	},
	{
		group: 'Major Offenses - Category B',
		label: 'Use of profane language that expresses grave insult toward any member of the STI community',
		value: 'Use of profane language that expresses grave insult toward any member of the STI community',
	},
	{
		group: 'Major Offenses - Category B',
		label: 'Major Offense B - Others',
		value: 'Major Offense B - Others',
	},
	{
		group: 'Major Offenses - Category C',
		label: '"Hacking" attacks on the computer system of the school and/or other institutions',
		value: '"Hacking" attacks on the computer system of the school and/or other institutions',
	},
	{
		group: 'Major Offenses - Category C',
		label: 'Stealing, tampering, or forgery of records and receipts',
		value: 'Stealing, tampering, or forgery of records and receipts',
	},
	{
		group: 'Major Offenses - Category C',
		label: 'Theft or robbery of school property or those belongings to school officials, teachers, personnel, other students, any member of the STI community, visitors, and guests',
		value: 'Theft or robbery of school property or those belongings to school officials, teachers, personnel, other students, any member of the STI community, visitors, and guests',
	},
	{
		group: 'Major Offenses - Category C',
		label: 'Unauthorized, copying, distribution, modification, and/or exhibition - in whole or in part of - eLMS materials or other learning materials provided by STI such as but not limited to videos, PowerPoint presentations, handouts, activity/worksheets, and answer keys',
		value: 'Unauthorized, copying, distribution, modification, and/or exhibition - in whole or in part of - eLMS materials or other learning materials provided by STI such as but not limited to videos, PowerPoint presentations, handouts, activity/worksheets, and answer keys',
	},
	{
		group: 'Major Offenses - Category C',
		label: 'Embezzlement and malversation of school or organization funds or property',
		value: 'Embezzlement and malversation of school or organization funds or property',
	},
	{
		group: 'Major Offenses - Category C',
		label: 'Disruption of academic functions or school activities through illegal assemblies, demonstrations, boycotts, pickets, and/or mass actions or related activities which tend to create ublic disorder or disturbance',
		value: 'Disruption of academic functions or school activities through illegal assemblies, demonstrations, boycotts, pickets, and/or mass actions or related activities which tend to create ublic disorder or disturbance',
	},
	{
		group: 'Major Offenses - Category C',
		label: 'Any act of Immorality',
		value: 'Any act of Immorality',
	},
	{
		group: 'Major Offenses - Category C',
		label: 'Any act of Bullying (such as but not limited to: physical, cyber, and verbal)',
		value: 'Any act of Bullying (such as but not limited to: physical, cyber, and verbal)',
	},
	{
		group: 'Major Offenses - Category C',
		label: 'Participation in brawls or infliction of physical injuries within and/or outside school premises whether in school uniform or not',
		value: 'Participation in brawls or infliction of physical injuries within and/or outside school premises whether in school uniform or not',
	},
	{
		group: 'Major Offenses - Category C',
		label: 'Physical assault upon another within and/or outside the school premises whether in school uniform or not',
		value: 'Physical assault upon another within and/or outside the school premises whether in school uniform or not',
	},
	{
		group: 'Major Offenses - Category C',
		label: 'Use of probihited drugs or chemicals in any form within and outside the school premises whether in uniform or not',
		value: 'Use of probihited drugs or chemicals in any form within and outside the school premises whether in uniform or not',
	},
	{
		group: 'Major Offenses - Category C',
		label: 'Giving false or malicious fire alarms and bomb threats',
		value: 'Giving false or malicious fire alarms and bomb threats',
	},
	{
		group: 'Major Offenses - Category C',
		label: 'Use of fire protective or fire fighting equipment of the school other than for fire fighting except in other emergencies where their use are justified',
		value: 'Use of fire protective or fire fighting equipment of the school other than for fire fighting except in other emergencies where their use are justified',
	},
	{
		group: 'Major Offenses - Category C',
		label: 'Major Offense C - Others',
		value: 'Major Offense C - Others',
	},
	{
		group: 'Major Offenses - Category D',
		label: 'Possession or sale of prohibited drugs or chemicals in any form, and/or any illegal drug paraphernalia within and outside the school premises whether in uniform or not',
		value: 'Possession or sale of prohibited drugs or chemicals in any form, and/or any illegal drug paraphernalia within and outside the school premises whether in uniform or not',
	},
	{
		group: 'Major Offenses - Category D',
		label: 'Carrying or possession of firearms, deadly weapons, and explosives within and outside the school premises whether in uniform or not',
		value: 'Carrying or possession of firearms, deadly weapons, and explosives within and outside the school premises whether in uniform or not',
	},
	{
		group: 'Major Offenses - Category D',
		label: 'Membership and/or affiliations in organizations, such as but not limited to fraternities and sororities, that employ or advocate illegal rites or ceremonies which include hazing and initiation',
		value: 'Membership and/or affiliations in organizations, such as but not limited to fraternities and sororities, that employ or advocate illegal rites or ceremonies which include hazing and initiation',
	},
	{
		group: 'Major Offenses - Category D',
		label: 'Participation in illegal rites, ceremonies, and ordeals which includes hazing and initiation',
		value: 'Participation in illegal rites, ceremonies, and ordeals which includes hazing and initiation',
	},
	{
		group: 'Major Offenses - Category D',
		label: 'Commission of crime involving moral turpitude (such as but not limited to rape, forgery, estafa, acts of lasciviousness, moral depravity, murder, and homicide)',
		value: 'Commission of crime involving moral turpitude (such as but not limited to rape, forgery, estafa, acts of lasciviousness, moral depravity, murder, and homicide)',
	},
	{
		group: 'Major Offenses - Category D',
		label: 'Commission of acts constituting sexual harassment as defined in the Student Manual and Republic Act 7877, otherwise known as the "Anti-Sexual Harassment Act of 1995"',
		value: 'Commission of acts constituting sexual harassment as defined in the Student Manual and Republic Act 7877, otherwise known as the "Anti-Sexual Harassment Act of 1995"',
	},
	{
		group: 'Major Offenses - Category D',
		label: 'Acts of subversion, sedition, or insurgency',
		value: 'Acts of subversion, sedition, or insurgency',
	},
	{
		group: 'Major Offenses - Category D',
		label: 'Major Offense D - Others',
		value: 'Major Offense D - Others',
	},
];
