import { useUserRole, UserRole } from "./useUserRole";

interface PermissionsData {
  // Patients
  canViewAllPatients: boolean;
  canCreatePatient: boolean;
  canEditPatient: boolean;
  canUpdatePatient: boolean;
  canDeletePatient: boolean;
  
  // Cost Savings Cases
  canViewAllCases: boolean;
  canCreateCase: boolean;
  canEvaluateCase: boolean;
  canEditCase: boolean;
  
  // Appointments
  canViewAllAppointments: boolean;
  canCreateAppointment: boolean;
  canEditAppointment: boolean;
  
  // Medical Records
  canViewAllMedicalRecords: boolean;
  canCreateMedicalRecord: boolean;
  canEditMedicalRecord: boolean;
  
  // Prescriptions
  canViewAllPrescriptions: boolean;
  canCreatePrescription: boolean;
  canEditPrescription: boolean;
  
  // Reports
  canViewReports: boolean;
  canGenerateReports: boolean;
  
  // Users & Config
  canManageUsers: boolean;
  canManageConfiguration: boolean;
  
  // Doctors
  canViewDoctors: boolean;
  canManageDoctors: boolean;
  
  // Adherence
  canViewAdherence: boolean;
  canCreateAdherence: boolean;
  canEditAdherence: boolean;
}

export const usePermissions = (): PermissionsData & { role: UserRole | null; isLoading: boolean } => {
  const { role, isLoading, isAdmin, isMedico, isMedicoEvaluador, isGestor, isPaciente } = useUserRole();

  // Administrador tiene acceso total a TODOS los módulos y funcionalidades
  if (isAdmin) {
    return {
      role,
      isLoading,
      canViewAllPatients: true,
      canCreatePatient: true,
      canEditPatient: true,
      canUpdatePatient: true,
      canDeletePatient: true,
      canViewAllCases: true,
      canCreateCase: true,
      canEvaluateCase: true,
      canEditCase: true,
      canViewAllAppointments: true,
      canCreateAppointment: true,
      canEditAppointment: true,
      canViewAllMedicalRecords: true,
      canCreateMedicalRecord: true,
      canEditMedicalRecord: true,
      canViewAllPrescriptions: true,
      canCreatePrescription: true,
      canEditPrescription: true,
      canViewReports: true,
      canGenerateReports: true,
      canManageUsers: true,
      canManageConfiguration: true,
      canViewDoctors: true,
      canManageDoctors: true,
      canViewAdherence: true,
      canCreateAdherence: true,
      canEditAdherence: true,
    };
  }

  return {
    role,
    isLoading,
    
    // Patients permissions
    canViewAllPatients: !isPaciente, // All except patients
    canCreatePatient: isMedico || isMedicoEvaluador,
    canEditPatient: isMedico || isMedicoEvaluador,
    canUpdatePatient: isMedico || isMedicoEvaluador,
    canDeletePatient: false,
    
    // Cost Savings Cases permissions
    canViewAllCases: !isPaciente, // All except patients
    canCreateCase: isMedico || isMedicoEvaluador,
    canEvaluateCase: isMedicoEvaluador,
    canEditCase: isMedicoEvaluador,
    
    // Appointments permissions
    canViewAllAppointments: !isPaciente,
    canCreateAppointment: isMedico || isMedicoEvaluador,
    canEditAppointment: isMedico || isMedicoEvaluador,
    
    // Medical Records permissions
    canViewAllMedicalRecords: !isPaciente,
    canCreateMedicalRecord: isMedico || isMedicoEvaluador,
    canEditMedicalRecord: isMedico || isMedicoEvaluador,
    
    // Prescriptions permissions
    canViewAllPrescriptions: !isPaciente,
    canCreatePrescription: isMedico || isMedicoEvaluador,
    canEditPrescription: isMedico || isMedicoEvaluador,
    
    // Reports permissions
    canViewReports: isGestor,
    canGenerateReports: isGestor,
    
    // Users & Configuration permissions
    canManageUsers: false,
    canManageConfiguration: false,
    
    // Doctors permissions
    canViewDoctors: isGestor,
    canManageDoctors: false,
    
    // Adherence permissions
    canViewAdherence: !isPaciente,
    canCreateAdherence: isMedico || isMedicoEvaluador,
    canEditAdherence: isMedico || isMedicoEvaluador,
  };
};
