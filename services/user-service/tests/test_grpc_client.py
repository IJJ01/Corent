import os
import sys

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(BASE_DIR)




import grpc

from shared.generated import user_pb2, user_pb2_grpc


def main():
    channel = grpc.insecure_channel("127.0.0.1:50051")
    stub = user_pb2_grpc.UserServiceStub(channel)

    print("=== TEST: SignupProcess ===")
    signup_res = stub.SignupProcess(
        user_pb2.SignupRequest(
            email="test@example.com",
            password="TestPassword123!",
            phone_number="0600000000",
            CIN="AA123456",
            first_name="Test",
            last_name="User",
            birth_date="2000-01-01",
            profile_pic_url="",
            adress="",
            city="Casablanca",
        )
    )
    print("ok:", signup_res.ok)
    print("message:", signup_res.message)
    print("token:", signup_res.access_token[:25] + "..." if signup_res.access_token else "")
    print("user_id:", signup_res.user.user_id)
    

    print()

    print("=== TEST: LoginProcess ===")
    login_res = stub.LoginProcess(
        user_pb2.LoginRequest(
            email="test@example.com",
            password="ResetPass999!",

        )
    )
    print("ok:", login_res.ok)
    print("message:", login_res.message)
    print("token:", login_res.access_token[:25] + "..." if login_res.access_token else "")
    print("is_admin:", login_res.user.is_admin)
    print("banned_at:", login_res.user.banned_at)
    print()
    user_id = signup_res.user.user_id or login_res.user.user_id


    print("=== TEST: ListAllUsers ===")
    metadata = (("authorization", f"Bearer {login_res.access_token}"),)

    list_res = stub.ListAllUsers(
        user_pb2.ListAllUsersRequest(),
        metadata=metadata
    )

    print("ok:", list_res.ok)
    print("message:", list_res.message)
    print("count:", len(list_res.users))
    if list_res.users:
        print("first_user:", list_res.users[0].user_id, "|", list_res.users[0].email)
    user_id = list_res.users[0].user_id
    print()

    



    print("=== TEST: ListUserInfosForProfile ===")
    profile_res = stub.ListUserInfosForProfile(
    user_pb2.UserIdRequest(user_id=user_id),
    metadata=metadata
    )

    print("ok:", profile_res.ok)
    print("message:", profile_res.message)
    print("profile:", profile_res.user_id, profile_res.first_name, profile_res.last_name, profile_res.city, profile_res.is_admin)
    print()






    print("=== TEST: EditUserInfos (change city + first_name) ===")
    edit_res = stub.EditUserInfos(
        user_pb2.EditUserInfosRequest(
            user_id=user_id,
            city="Rabat",
            first_name="NewName",
        ),
        metadata=metadata
    )
    print("ok:", edit_res.ok)
    print("message:", edit_res.message)
    print("updated:", edit_res.user.user_id, edit_res.user.first_name, edit_res.user.city)
    print()


    print("=== TEST: EditUserPassword ===")
    pass_res = stub.EditUserPassword(
        user_pb2.EditUserPasswordRequest(
            user_id=user_id,
            old_password="NewPassword123!",
            new_password="NewPassword456!",
        ),
        metadata=metadata
    )
    print("ok:", pass_res.ok)
    print("message:", pass_res.message)
    print()


    print("=== TEST: ForgetPasswordProcess ===")
    forget_res = stub.ForgetPasswordProcess(
        user_pb2.ForgetPasswordRequest(email="test@example.com")
    )
    print("ok:", forget_res.ok)
    print("message:", forget_res.message)
    print()



    print("=== TEST: ResetPasswordProcess ===")
    token = forget_res.message.split("token=")[-1].strip()
    reset_res = stub.ResetPasswordProcess(
        user_pb2.ResetPasswordRequest(
            token=token,
            new_password="ResetPass999!",
        ),
        metadata=metadata
    )
    print("ok:", reset_res.ok)
    print("message:", reset_res.message)
    print()


    print("=== TEST: ListAdmins (should fail if not admin) ===")
    try:
        admins_res = stub.ListAdmins(user_pb2.ListAdminsRequest(), metadata=metadata)
        print("ok:", admins_res.ok)
        print("message:", admins_res.message)
        print("count:", len(admins_res.users))
    except grpc.RpcError as e:
        print("RPC ERROR:", e.code(), "-", e.details())
    print()

    print("=== TEST: BanUser ===")
    ban_res = stub.BanUser(user_pb2.UserIdRequest(user_id=user_id), metadata=metadata)
    print("ok:", ban_res.ok)
    print("message:", ban_res.message)
    print("banned_at:", ban_res.user.banned_at)
    print()

    print("=== TEST: UnbanUser ===")
    unban_res = stub.UnbanUser(user_pb2.UserIdRequest(user_id=user_id), metadata=metadata)
    print("ok:", unban_res.ok)
    print("message:", unban_res.message)
    print("banned_at:", unban_res.user.banned_at)
    print()





if __name__ == "__main__":
    main()
